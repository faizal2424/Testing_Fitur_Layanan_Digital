import { db } from '$lib/server/db';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationPayload {
	userId?: bigint;
	title: string;
	message: string;
	adminMessage?: string;
	type?: NotificationType;
	link?: string;
}

export const NotificationService = {
	/**
	 * Send notification to a specific user and all admins.
	 */
	async send(payload: NotificationPayload) {
		const { userId, title, message, adminMessage, type = 'info', link } = payload;

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

		// 2. Add specific user if provided
		if (userId) {
			targetIds.add(userId);
		}

		// 3. Add all admins (they receive everything)
		adminIds.forEach((id) => targetIds.add(id));

		// 4. Create notification records in bulk
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
