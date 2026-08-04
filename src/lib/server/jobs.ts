/**
 * Job helpers — antarmuka async untuk email & notifikasi.
 * Semua pengiriman email/notifikasi di-app melalui queue agar request tidak terblokir.
 */
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