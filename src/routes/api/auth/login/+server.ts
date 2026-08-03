import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword, createSession, checkRateLimit } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const ip = getClientAddress();

	const rateLimit = checkRateLimit(ip);
	if (!rateLimit.allowed) {
		return json(
			{ success: false, error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.' },
			{ status: 429 }
		);
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Request body harus berupa JSON.' }, { status: 400 });
	}

	const username = body.username?.toString()?.trim() || '';
	const password = body.password?.toString() || '';
	const remember = body.remember === true || body.remember === 'true';

	if (!username || !password) {
		return json({ success: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
	}

	const user = await db.users.findFirst({
		where: { OR: [{ username }, { email: username }] },
		include: { user_roles: { include: { roles: true } } }
	});

	if (!user) {
		return json({ success: false, error: 'Username atau password salah.' }, { status: 401 });
	}

	const valid = await verifyPassword(password, user.password);
	if (!valid) {
		return json({ success: false, error: 'Username atau password salah.' }, { status: 401 });
	}

	await createSession(user.id, cookies, remember);

	const role = user.user_roles[0]?.roles.name.toLowerCase() || 'pic';
	const redirectPath = role === 'pic' ? '/admin/pengajuan' : '/admin';

	return json({
		success: true,
		user: {
			id: user.id.toString(),
			name: user.name,
			username: user.username || '',
			email: user.email,
			role,
			redirectPath
		}
	});
};