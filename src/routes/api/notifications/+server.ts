import { ok, unauthorized, serverError } from '$lib/server/api-response';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return unauthorized('Tidak terautentikasi.');
	}

	try {
		// Use raw SQL because Prisma model mapping for 'notifications' is currently out of sync in dev
		// Fetch both read and unread for history
		const notifications = (await db.$queryRawUnsafe(
			`SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 20`,
			BigInt(user.id)
		)) as any[];

		return ok({ notifications });
	} catch (err) {
		console.error('Error fetching notifications:', err);
		return ok({ notifications: [] });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return unauthorized('Tidak terautentikasi.');
	}

	try {
		const { id, all } = await request.json();

		if (all) {
			await db.$executeRawUnsafe(
				'UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE user_id = ? AND is_read = 0',
				BigInt(user.id)
			);
		} else if (id) {
			await db.$executeRawUnsafe(
				'UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE id = ? AND user_id = ?',
				BigInt(id),
				BigInt(user.id)
			);
		}

		return ok({ success: true });
	} catch (err) {
		console.error('Error updating notification:', err);
		return serverError('Gagal memperbarui notifikasi.');
	}
};