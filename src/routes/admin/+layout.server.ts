import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Guard: redirect to login if not authenticated
	if (!locals.user) {
		throw redirect(302, '/mlebet');
	}

	return {
		user: {
			id: locals.user.id.toString(),
			name: locals.user.name,
			username: locals.user.username,
			email: locals.user.email,
			phone: locals.user.phone,
			role: locals.user.role
		}
	};
};
