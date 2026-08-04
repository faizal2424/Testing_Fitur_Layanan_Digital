/**
 * Queue Service — Laravel-compatible `jobs` table.
 *
 * Digunakan untuk menjalankan pekerjaan berat (email, notifikasi) secara async
 * sehingga request utama tidak terblokir oleh operasi I/O eksternal.
 *
 * Tabel `jobs` yang dipakai sesuai dengan struktur Laravel:
 *   id, queue, payload, attempts, reserved_at, available_at, created_at
 */
import { db } from './db';

export const QUEUE_EMAIL = 'email';
export const QUEUE_NOTIFICATION = 'notification';

export const MAX_ATTEMPTS = 3;

/** Struktur baris tabel `jobs` yang diambil via raw query. */
export interface JobRecord {
	id: bigint | number;
	queue: string;
	payload: unknown;
	attempts: number;
	reserved_at: number | null;
	available_at: number;
	created_at: number;
}

export interface QueuedJob<T = unknown> {
	name: string;
	data: T;
	delaySeconds?: number;
	attempts?: number;
}

/**
 * Enqueue sebuah job ke tabel `jobs`.
 * Aman untuk BigInt karena payload di-serialize manual.
 */
export async function dispatch(queue: string, job: QueuedJob): Promise<bigint> {
	const now = Math.floor(Date.now() / 1000);
	const availableAt = job.delaySeconds ? now + job.delaySeconds : now;

	const payload = JSON.stringify(job, (key, value) =>
		typeof value === 'bigint' ? value.toString() : value
	);

	const result = await db.jobs.create({
		data: {
			queue,
			payload,
			attempts: 0,
			available_at: availableAt,
			created_at: now
		}
	});

	return result.id;
}

/**
 * Ambil job berikutnya yang tersedia (FIFO per queue) dan tandai sebagai
 * sedang diproses secara atomik.
 *
 * Strategi: "claim via update" (CAS) — cari id job tertua yang memenuhi syarat,
 * lalu UPDATE hanya jika `reserved_at` masih NULL. `affectedRows === 0` berarti
 * job sudah di-claim worker lain -> di-skip. Kompatibel dengan MariaDB < 10.6
 * (tanpa `FOR UPDATE SKIP LOCKED` yang baru tersedia sejak 10.6.0).
 */
export async function reserveNextJob(
	queue: string,
	now = Math.floor(Date.now() / 1000)
): Promise<JobRecord | null> {
	const rows = (await db.$queryRawUnsafe(
		`SELECT id FROM jobs
		 WHERE queue = ? AND available_at <= ? AND reserved_at IS NULL
		 ORDER BY id ASC
		 LIMIT 1`,
		queue,
		now
	)) as { id: bigint | number }[];

	if (!rows.length) return null;

	// Claim atomik: hanya berhasil jika belum di-reserve worker lain.
	const result = await db.$executeRawUnsafe(
		`UPDATE jobs SET reserved_at = ?, attempts = attempts + 1
		 WHERE id = ? AND reserved_at IS NULL`,
		now,
		BigInt(rows[0].id)
	);

	if (result === 0) return null; // sudah di-claim worker lain

	const claimed = (await db.$queryRawUnsafe(
		`SELECT * FROM jobs WHERE id = ?`,
		BigInt(rows[0].id)
	)) as JobRecord[];

	if (!claimed.length) return null;

	const job = claimed[0];
	job.payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
	return job;
}

/** Release job setelah sukses. */
export async function markJobDone(jobId: bigint | number): Promise<void> {
	await db.jobs.delete({ where: { id: BigInt(jobId) } });
}

/** Hapus job (misal sudah gagal total). */
export async function deleteJob(jobId: bigint | number): Promise<void> {
	await db.jobs.delete({ where: { id: BigInt(jobId) } });
}

/** Lepaskan reservasi agar job bisa dicoba lagi nanti (retry / backoff). */
export async function releaseJob(
	jobId: bigint | number,
	availableAt: number
): Promise<void> {
	await db.$executeRawUnsafe(
		`UPDATE jobs SET reserved_at = NULL, available_at = ? WHERE id = ?`,
		availableAt,
		BigInt(jobId)
	);
}

/** Catat job yang gagal permanen ke tabel failed_jobs (Laravel-compatible). */
export async function recordFailedJob(
	job: JobRecord,
	exception: string,
	queue: string
): Promise<void> {
	const { randomUUID } = await import('crypto');
	const now = new Date();

	await db.$executeRawUnsafe(
		`INSERT INTO failed_jobs (uuid, connection, queue, payload, exception, failed_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		randomUUID(),
		'database',
		queue,
		typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload),
		exception,
		now
	);

	// Hapus dari tabel jobs
	await deleteJob(job.id);
}