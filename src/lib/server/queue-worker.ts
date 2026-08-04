/**
 * Queue Worker — memproses job email & notifikasi dari tabel `jobs`.
 * Jalankan terpisah: npm run queue:work (scripts/queue-worker.cjs)
 * Retry exponential backoff (30s, 2m, 10m), polling tiap 2 detik.
 */
import { db } from './db';
import { sendMail } from './mailer';
import { NotificationService } from './notifications';
import {
	QUEUE_EMAIL,
	QUEUE_NOTIFICATION,
	MAX_ATTEMPTS,
	reserveNextJob,
	markJobDone,
	releaseJob,
	recordFailedJob,
	type JobRecord
} from './queue';

type JobPayload = { name: string; data: Record<string, unknown> };

function backoffSeconds(attempt: number): number {
	return [30, 120, 600][Math.min(attempt - 1, 2)] ?? 600;
}

async function handleJob(job: JobRecord): Promise<void> {
	const payload = job.payload as JobPayload;
	const { name, data } = payload;

	switch (job.queue) {
		case QUEUE_EMAIL:
			if (name === 'send-email') {
				await sendMail(data as unknown as Parameters<typeof sendMail>[0]);
			} else {
				throw new Error(`Unknown email job: ${name}`);
			}
			break;
		case QUEUE_NOTIFICATION:
			if (name === 'send-notification') {
				await NotificationService.send(
					data as unknown as Parameters<typeof NotificationService.send>[0]
				);
			} else {
				throw new Error(`Unknown notification job: ${name}`);
			}
			break;
		default:
			throw new Error(`Unsupported queue: ${job.queue}`);
	}
}

async function processJob(job: JobRecord): Promise<void> {
	try {
		await handleJob(job);
		await markJobDone(job.id);
		const name = (job.payload as JobPayload).name;
		console.log(`[Worker] Job #${job.id} (${job.queue}/${name}) sukses`);
	} catch (error) {
		const attempts = job.attempts ?? 1;
		const errMsg = error instanceof Error ? error.stack ?? error.message : String(error);
		if (attempts >= MAX_ATTEMPTS) {
			await recordFailedJob(job, errMsg, job.queue);
			console.error(`[Worker] Job #${job.id} gagal permanen setelah ${attempts}x`, error);
		} else {
			const delay = backoffSeconds(attempts);
			await releaseJob(job.id, Math.floor(Date.now() / 1000) + delay);
			console.warn(`[Worker] Job #${job.id} gagal (${attempts}/${MAX_ATTEMPTS}), retry ${delay}s`, error);
		}
	}
}

async function pollOnce(): Promise<void> {
	for (const queue of [QUEUE_EMAIL, QUEUE_NOTIFICATION]) {
		const job = await reserveNextJob(queue);
		if (job) await processJob(job);
	}
}

export function startQueueWorker(intervalMs = 2000): NodeJS.Timeout {
	console.log('[QueueWorker] Dimulai — queue email & notification');
	return setInterval(() => {
		pollOnce().catch((err) => console.error('[QueueWorker] Polling error:', err));
	}, intervalMs);
}

const isDirectRun =
	process.argv[1]?.endsWith('queue-worker.ts') || process.argv[1]?.endsWith('queue-worker.js');

if (isDirectRun) {
	startQueueWorker();
	const shutdown = async () => {
		console.log('[QueueWorker] Shutdown...');
		await db.$disconnect();
		process.exit(0);
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}