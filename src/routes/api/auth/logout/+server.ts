import { ok } from '$lib/server/api-response';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	return ok(null, 'Berhasil logout.');
};