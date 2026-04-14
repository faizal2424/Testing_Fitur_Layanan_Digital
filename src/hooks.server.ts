import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
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
