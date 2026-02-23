import type { Handle } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// Load user session for every request
	event.locals.user = await getSessionUser(event.cookies);

	return resolve(event);
};
