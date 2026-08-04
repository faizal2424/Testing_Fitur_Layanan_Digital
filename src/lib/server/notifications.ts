import { db } from '$lib/server/db';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Routing penerima notifikasi in-app.
 * - 'admins'     → hanya semua admin/superadmin
 * - 'user_only'  → hanya user spesifik (userId)
 * - 'both'       → user spesifik + semua admin (default, perilaku lama)
 */
export type RecipientRouting = 'admins' | 'user_only' | 'both';

export interface NotificationPayload {
	/**
	 * Id user penerima notifikasi.
	 * Bisa `bigint` (langsung) atau `string` (setelah melewati queue,
	 * karena JSON tidak mendukung bigint dan di-serialize sebagai string).
	 */
	userId?: bigint | string;
	title: string;
	message: string;
	adminMessage?: string;
	type?: NotificationType;
	link?: string;
	/** Routing penerima. Default: 'both' (user + semua admin). */
	recipients?: RecipientRouting;
}

export const NotificationService = {
	/**
	 * Send notification dengan routing penerima.
	 *
	 * `recipients`:
	 * - 'both' (default): user spesifik + semua admin
	 * - 'admins': hanya semua admin
	 * - 'user_only': hanya user spesifik (tanpa admin)
	 */
	async send(payload: NotificationPayload) {
		const {
			userId,
			title,
			message,
			adminMessage,
			type = 'info',
			link,
			recipients = 'both'
		} = payload;

		// Normalisasi userId dari queue: JSON mengubah bigint → string,
		// jadi bandingkan selalu dalam bentuk bigint agar konsisten
		// dengan id user dari Prisma.
		const normalizedUserId = userId != null ? BigInt(String(userId)) : undefined;

		// 1. Get all admin/superadmin users
		const admins = await db.users.findMany({
			where: {
				user_roles: {
					some: {
						roles: {
							name: { in: ['admin', 'superadmin', 'Admin', 'Superadmin'] }
						}
					}
				}
			},
			select: { id: true }
		});

		const adminIds = admins.map((a) => a.id);
		const targetIds = new Set<bigint>();

		// 2. Routing logic
		if (recipients === 'admins') {
			// Hanya admin
			adminIds.forEach((id) => targetIds.add(id));
		} else if (recipients === 'user_only') {
			// Hanya user spesifik
			if (normalizedUserId != null) {
				targetIds.add(normalizedUserId);
			}
		} else {
			// 'both' (default): user + semua admin
			if (normalizedUserId != null) {
				targetIds.add(normalizedUserId);
			}
			adminIds.forEach((id) => targetIds.add(id));
		}

		// 3. Create notification records in bulk
		if (targetIds.size === 0) return;

		try {
			// Fallback to raw SQL because Prisma model mapping for 'notifications' is currently out of sync in dev
			for (const id of targetIds) {
				// Determine which message to use:
				// If it's an admin and adminMessage is provided, use it.
				// Otherwise use the default message.
				const isAdmin = adminIds.includes(id);
				const finalMessage = (isAdmin && adminMessage) ? adminMessage : message;

				await db.$executeRawUnsafe(
					`INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at, updated_at) 
					 VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
					id, title, finalMessage, type, link || null
				);
			}
		} catch (error) {
			console.error('[NotificationService] Failed to create notifications:', error);
		}
	}
};