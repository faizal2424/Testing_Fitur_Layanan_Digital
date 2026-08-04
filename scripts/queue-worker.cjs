#!/usr/bin/env node
/* eslint-disable */
/**
 * Queue Worker Standalone — memproses job email & notifikasi dari tabel `jobs`.
 *
 * SvelteKit worker (`src/lib/server/queue-worker.ts`) tidak bisa dijalankan
 * langsung dengan `node` karena menggunakan alias `$env/` dan `$lib/`.
 * File ini adalah entry point mandiri tanpa dependensi Prisma/SvelteKit.
 *
 * Penggunaan:
 *   npm run queue:work
 *   QUEUE_POLL_INTERVAL_MS=5000 npm run queue:work
 *
 * Perilaku:
 *   - Polling tiap 2 detik (default) / QUEUE_POLL_INTERVAL_MS
 *   - FIFO per queue (`ORDER BY id ASC`)
 *   - Reserve atomik via conditional UPDATE (CAS) — kompatibel MariaDB 10.4
 *     (tanpa `FOR UPDATE SKIP LOCKED` yang baru ada di MariaDB 10.6+)
 *   - Retry exponential backoff: 30s, 2m, 10m
 *   - Setelah 3x gagal -> dipindah ke tabel failed_jobs
 */
'use strict';

try {
	require('dotenv').config();
} catch {
	// dotenv opsional — bila tidak terpasang, env dibaca dari sistem/proses.
}

const { randomUUID } = require('crypto');
const mariadb = require('mariadb/promise');
const nodemailer = require('nodemailer');

const QUEUE_EMAIL = 'email';
const QUEUE_NOTIFICATION = 'notification';
const MAX_ATTEMPTS = 3;
const POLL_MS = Number(process.env.QUEUE_POLL_INTERVAL_MS) || 2000;

/** Backoff eksponensial: 30s -> 2m -> 10m. */
function backoffSeconds(attempt) {
	return [30, 120, 600][Math.min(attempt - 1, 2)] ?? 600;
}

function parseDbUrl(url) {
	const m = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
	if (!m) throw new Error('Invalid DATABASE_URL');
	return {
		user: m[1],
		password: m[2],
		host: m[3],
		port: parseInt(m[4], 10),
		database: m[5]
	};
}

const cfg = parseDbUrl(process.env.DATABASE_URL);

/** Pool koneksi MariaDB/MySQL. BigInt dikembalikan sebagai string. */
const pool = mariadb.createPool({
	...cfg,
	connectionLimit: 5,
	supportBigNumbers: true,
	bigIntAsNumber: false
});

/** Transporter nodemailer — dibuat sekali, dipakai ulang. */
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT),
	secure: process.env.SMTP_SECURE === 'true', // true untuk port 465, false untuk STARTTLS 587/2525
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS
	}
});

/**
 * Ambil job berikutnya yang tersedia (FIFO) dan tandai sebagai sedang diproses.
 *
 * Strategi: "claim via update" (CAS) — cari id job tertua yang memenuhi syarat,
 * lalu UPDATE hanya jika `reserved_at` masih NULL. `affectedRows === 0` berarti
 * job sudah di-claim worker lain -> skip. Aman dijalankan oleh banyak worker
 * dan kompatibel dengan MariaDB < 10.6 (tanpa FOR UPDATE SKIP LOCKED).
 *
 * @returns {Promise<{ job: object, attempts: number } | null>}
 *   `attempts` = jumlah percobaan SETELAH inkremen di DB (1, 2, 3, ...).
 */
async function reserveNextJob(queue) {
	const now = Math.floor(Date.now() / 1000);

	const candidate = await pool.query(
		`SELECT id FROM jobs
		 WHERE queue = ? AND available_at <= ? AND reserved_at IS NULL
		 ORDER BY id ASC
		 LIMIT 1`,
		[queue, now]
	);

	const row = candidate[0];
	if (!row) return null;

	// Claim atomik: hanya berhasil jika belum di-reserve worker lain.
	const result = await pool.query(
		`UPDATE jobs SET reserved_at = ?, attempts = attempts + 1
		 WHERE id = ? AND reserved_at IS NULL`,
		[now, String(row.id)]
	);

	if (result.affectedRows === 0) return null; // sudah di-claim worker lain

	const job = await pool.query(`SELECT * FROM jobs WHERE id = ?`, [String(row.id)]);
	const claimed = job[0];
	claimed.payload = typeof claimed.payload === 'string' ? JSON.parse(claimed.payload) : claimed.payload;
	return { job: claimed, attempts: Number(claimed.attempts) };
}

/** Hapus job dari tabel `jobs` setelah sukses. */
async function markJobDone(jobId) {
	await pool.query(`DELETE FROM jobs WHERE id = ?`, [String(jobId)]);
}

/** Lepaskan reservasi agar job dicoba lagi nanti (retry / backoff). */
async function releaseJob(jobId, availableAt) {
	await pool.query(
		`UPDATE jobs SET reserved_at = NULL, available_at = ? WHERE id = ?`,
		[availableAt, String(jobId)]
	);
}

/** Catat job yang gagal permanen ke tabel failed_jobs dan hapus dari jobs. */
async function recordFailedJob(job, exception, queue) {
	const payload =
		typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload);

	await pool.query(
		`INSERT INTO failed_jobs (uuid, connection, queue, payload, exception, failed_at)
		 VALUES (?, 'database', ?, ?, ?, ?)`,
		[randomUUID(), queue, payload, exception, new Date()]
	);
	await markJobDone(job.id);
}

/** Proses job email via nodemailer. */
async function handleEmail(data) {
	const { to, subject, html, text, cc, bcc, replyTo } = data;

	const mail = { from: process.env.SMTP_FROM, to, subject, html };
	if (text) mail.text = text;
	if (cc) mail.cc = cc;
	if (bcc) mail.bcc = bcc;
	if (replyTo) mail.replyTo = replyTo;

	const info = await transporter.sendMail(mail);
	console.log(
		`[Mailer] Email terkirim ke ${Array.isArray(to) ? to.join(', ') : to} — MessageId: ${info.messageId}`
	);
}

/**
 * Cek idempotency di email_logs SEBELUM sendMail (anti-duplikasi saat retry).
 * UNIQUE (submission_id, event_type, recipient_role, recipient_email).
 */
async function isEmailAlreadySent(meta) {
	const rows = await pool.query(
		`SELECT id FROM email_logs
		 WHERE submission_id = ? AND event_type = ? AND recipient_role = ? AND recipient_email = ?
		 LIMIT 1`,
		[String(meta.submissionId), meta.eventType, meta.recipientRole, meta.recipientEmail]
	);
	return rows.length > 0;
}

/** Catat hasil pengiriman ke email_logs. status: 'sent' | 'failed'. */
async function logEmailResult(meta, subject, status) {
	try {
		await pool.query(
			`INSERT INTO email_logs
			 (submission_id, event_type, recipient_email, recipient_role, subject, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
			[
				String(meta.submissionId),
				meta.eventType,
				meta.recipientEmail,
				meta.recipientRole,
				subject,
				status
			]
		);
	} catch (err) {
		// Duplicate key (race condition) — abaikan, email sudah dikirim job lain
		console.warn(`[Worker] Gagal catat email_logs (mungkin duplikat): ${String(err)}`);
	}
}

/** Proses job email event (E1..E9) dengan idempotency check + logging. */
async function handleEventEmail(data) {
	const { meta, mailOptions } = data;

	// Idempotency check ulang sebelum sendMail (anti-race condition)
	if (await isEmailAlreadySent(meta)) {
		console.log(
			`[Worker] Skip email ${meta.eventType} → ${meta.recipientEmail} (sudah dikirim)`
		);
		return;
	}

	try {
		await handleEmail(mailOptions);
		await logEmailResult(meta, mailOptions.subject, 'sent');
	} catch (error) {
		// Catat failed, lalu rethrow agar retry backoff berjalan
		await logEmailResult(meta, mailOptions.subject, 'failed');
		throw error;
	}
}

/**
 * Proses notifikasi: insert ke tabel notifications sesuai routing penerima.
 *
 * `recipients` (opsional, default 'both'):
 * - 'admins'    → hanya semua admin/superadmin
 * - 'user_only' → hanya user spesifik (userId)
 * - 'both'      → user spesifik + semua admin (perilaku lama)
 */
async function handleNotification(data) {
	const {
		userId,
		title,
		message,
		adminMessage,
		type = 'info',
		link,
		recipients = 'both'
	} = data;

	// 1. Ambil semua admin/superadmin
	const admins = await pool.query(
		`SELECT DISTINCT u.id FROM users u
		 JOIN user_roles ur ON ur.user_id = u.id
		 JOIN roles r ON r.id = ur.role_id
		 WHERE r.name IN ('admin', 'superadmin', 'Admin', 'Superadmin')`
	);

	const adminIds = new Set(admins.map((a) => String(a.id)));
	const targetIds = new Set();

	// 2. User spesifik (jika ada)
	if (userId != null) targetIds.add(String(userId));

	// 3. Routing penerima
	if (recipients === 'admins') {
		// Hanya admin — buang user spesifik
		targetIds.clear();
		adminIds.forEach((id) => targetIds.add(id));
	} else if (recipients === 'user_only') {
		// Hanya user spesifik — tanpa admin
		// targetIds sudah berisi userId saja
	} else {
		// 'both' (default): user + semua admin
		adminIds.forEach((id) => targetIds.add(id));
	}

	if (targetIds.size === 0) return;

	// 4. Insert record notifikasi
	for (const id of targetIds) {
		const isAdmin = adminIds.has(id);
		const finalMessage = isAdmin && adminMessage ? adminMessage : message;

		await pool.query(
			`INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
			[id, title, finalMessage, type, link || null]
		);
	}
}

async function handleJob(job) {
	const { name, data } = job.payload;

	switch (job.queue) {
		case QUEUE_EMAIL:
			if (name === 'send-email') {
				await handleEmail(data);
			} else if (name === 'send-event-email') {
				await handleEventEmail(data);
			} else {
				throw new Error(`Unknown email job: ${name}`);
			}
			break;
		case QUEUE_NOTIFICATION:
			if (name !== 'send-notification') throw new Error(`Unknown notification job: ${name}`);
			await handleNotification(data);
			break;
		default:
			throw new Error(`Unsupported queue: ${job.queue}`);
	}
}

async function processJob(job, attempts) {
	try {
		await handleJob(job);
		await markJobDone(job.id);
		console.log(`[Worker] Job #${job.id} (${job.queue}/${job.payload.name}) sukses`);
	} catch (error) {
		const errMsg = error instanceof Error ? error.stack || error.message : String(error);

		if (attempts >= MAX_ATTEMPTS) {
			await recordFailedJob(job, errMsg, job.queue);
			console.error(`[Worker] Job #${job.id} gagal permanen setelah ${attempts}x`, error);
		} else {
			const delay = backoffSeconds(attempts);
			const availableAt = Math.floor(Date.now() / 1000) + delay;
			await releaseJob(job.id, availableAt);
			console.warn(
				`[Worker] Job #${job.id} gagal (${attempts}/${MAX_ATTEMPTS}), retry ${delay}s`,
				error
			);
		}
	}
}

async function pollOnce() {
	for (const queue of [QUEUE_EMAIL, QUEUE_NOTIFICATION]) {
		const reserved = await reserveNextJob(queue);
		if (reserved) await processJob(reserved.job, reserved.attempts);
	}
}

let timer = null;
let shuttingDown = false;

async function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;
	console.log('[Worker] Shutdown...');
	if (timer) clearInterval(timer);
	try {
		await pool.end();
	} catch {
		// abaikan error menutup pool
	}
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
	console.log(`[Worker] Queue worker dimulai — poll interval ${POLL_MS}ms`);
	await pollOnce(); // proses langsung saat start
	timer = setInterval(() => {
		pollOnce().catch((err) => console.error('[Worker] Polling error:', err));
	}, POLL_MS);
}

main().catch((err) => {
	console.error('[Worker] Gagal memulai:', err);
	process.exit(1);
});