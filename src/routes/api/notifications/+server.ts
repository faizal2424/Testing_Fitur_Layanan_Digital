import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Use raw SQL because Prisma model mapping for 'notifications' is currently out of sync in dev
		// Fetch both read and unread for history
		const notifications = await db.$queryRawUnsafe(
			`SELECT * FROM notifications 
			 WHERE user_id = ? 
			 ORDER BY created_at DESC 
			 LIMIT 20`,
			BigInt(user.id)
		) as any[];

		return json({ notifications });
	} catch (err) {
		console.error('Error fetching notifications:', err);
		return json({ notifications: [] });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
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
				BigInt(id), BigInt(user.id)
			);
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error updating notification:', err);
		return json({ success: false }, { status: 500 });
	}
};
