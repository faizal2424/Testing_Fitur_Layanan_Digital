import { ok, fail, serverError } from '$lib/server/api-response';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword, createSession, checkRateLimit } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const ip = getClientAddress();

	const rateLimit = checkRateLimit(ip);
	if (!rateLimit.allowed) {
		return fail('Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.', 429);
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return fail('Request body harus berupa JSON.', 400);
	}

	const username = body.username?.toString()?.trim() || '';
	const password = body.password?.toString() || '';
	const remember = body.remember === true || body.remember === 'true';

	if (!username || !password) {
		return fail('Username dan password wajib diisi.', 400);
	}

	const user = await db.users.findFirst({ where: { OR: [{ username }, { email: username }] }, include: { user_roles: { include: { roles: true } } } });

	if (!user) {
		return fail('Username atau password salah.', 401);
	}

	const valid = await verifyPassword(password, user.password);
	if (!valid) {
		return fail('Username atau password salah.', 401);
	}

	try {
		await createSession(user.id, cookies, remember);
	} catch (err) {
		console.error('[login] Gagal membuat sesi:', err);
		return serverError('Gagal membuat sesi. Silakan coba lagi.');
	}

	const role = user.user_roles[0]?.roles.name.toLowerCase() || 'pic';
	const redirectPath = role === 'pic' ? '/admin/pengajuan' : '/admin';

	return ok({
		user: {
			id: user.id.toString(),
			name: user.name,
			username: user.username || '',
			email: user.email,
			role,
			redirectPath
		}
	}, 'Login berhasil.');
};