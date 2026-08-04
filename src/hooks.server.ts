import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getSessionUser } from '$lib/server/auth';

// Endpoint debug/seed yang TIDAK boleh diakses di production.
// Aktifkan kembali hanya jika ALLOW_DEBUG_ENDPOINTS=true.
const DEBUG_PATHS = ['/api/test-smtp', '/api/seed'];

export const handle: Handle = async ({ event, resolve }) => {
	// Guard: blokir endpoint debug/seed di production (default 404).
	if (
		!dev &&
		process.env.ALLOW_DEBUG_ENDPOINTS !== 'true' &&
		DEBUG_PATHS.some((p) => event.url.pathname === p || event.url.pathname.startsWith(p + '/'))
	) {
		return new Response('Not Found', { status: 404 });
	}

	// Load user session for every request
	event.locals.user = await getSessionUser(event.cookies);

	// Centralized Route Protection for Admin Panel
	if (event.url.pathname.startsWith('/admin')) {
		if (!event.locals.user) {
			// Redirect unauthenticated users to the login page
			throw redirect(303, '/mlebet');
		}
	}

	return resolve(event);
};
