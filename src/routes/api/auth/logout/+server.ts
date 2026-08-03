import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	return json({ success: true, message: 'Berhasil logout.' });
};
