/**
 * Job helpers — antarmuka async untuk email & notifikasi.
 * Semua pengiriman email/notifikasi di-app melalui queue agar request tidak terblokir.
 */
import { db } from './db';
import { dispatch, QUEUE_EMAIL, QUEUE_NOTIFICATION } from './queue';
import type { MailOptions } from './mailer';
import type { NotificationPayload } from './notifications';

/** Enqueue email — diproses worker secara async. */
export function enqueueEmail(options: MailOptions, delaySeconds = 0) {
	return dispatch(QUEUE_EMAIL, {
		name: 'send-email',
		data: options as unknown as Record<string, unknown>,
		delaySeconds
	});
}

/** Enqueue notifikasi — diproses worker secara async. */
export function enqueueNotification(payload: NotificationPayload, delaySeconds = 0) {
	return dispatch(QUEUE_NOTIFICATION, {
		name: 'send-notification',
		data: payload as unknown as Record<string, unknown>,
		delaySeconds
	});
}

/**
 * Metadata idempotency untuk email event (E1..E9).
 * Dipakai untuk cek `email_logs` sebelum dispatch & sebelum sendMail di worker.
 */
export interface EventEmailMeta {
	submissionId: bigint | string;
	eventType: string;
	recipientRole: string;
	recipientEmail: string;
}

/**
 * Enqueue email event dengan idempotency check.
 *
 * Cek `email_logs` (UNIQUE submission_id+event_type+recipient_role+recipient_email)
 * SEBELUM dispatch. Jika sudah pernah dikirim, job tidak dibuat (anti-duplikasi).
 *
 * Worker juga melakukan cek ulang sebelum `sendMail` (anti-race condition).
 */
export async function enqueueEventEmail(params: {
	submissionId: bigint | string;
	eventType: string;
	recipientRole: string;
	recipientEmail: string;
	mailOptions: MailOptions;
	delaySeconds?: number;
}): Promise<bigint | null> {
	const { submissionId, eventType, recipientRole, recipientEmail, mailOptions, delaySeconds = 0 } =
		params;

	const subId = BigInt(String(submissionId));

	// Idempotency check — cek email_logs sebelum dispatch
	const existing = await db.email_logs.findFirst({
		where: {
			submission_id: subId,
			event_type: eventType,
			recipient_role: recipientRole,
			recipient_email: recipientEmail
		},
		select: { id: true }
	});

	if (existing) {
		console.log(
			`[Jobs] Skip email ${eventType} → ${recipientEmail} (sudah dikirim, log #${existing.id})`
		);
		return null;
	}

	// Bawa metadata idempotency di dalam payload agar worker bisa cek ulang & catat
	const meta: EventEmailMeta = {
		submissionId: subId.toString(),
		eventType,
		recipientRole,
		recipientEmail
	};

	return dispatch(QUEUE_EMAIL, {
		name: 'send-event-email',
		data: {
			meta,
			mailOptions
		} as unknown as Record<string, unknown>,
		delaySeconds
	});
}