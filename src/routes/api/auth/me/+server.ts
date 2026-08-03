import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionUser } from '$lib/server/auth';

// GET /api/auth/me — cek user yang sedang login
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getSessionUser(cookies);

	if (!user) {
		return json({ authenticated: false, user: null }, { status: 401 });
	}

	return json({
		authenticated: true,
		user: {
			id: user.id.toString(),
			name: user.name,
			username: user.username,
			email: user.email,
			phone: user.phone,
			role: user.role,
			agency_id: user.agency_id,
			agency_name: user.agency_name
		}
	});
};