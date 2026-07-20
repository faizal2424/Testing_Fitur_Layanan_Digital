/**
 * GET /tracking?code=SVC-XXXXXXXX-XXXXX
 * Redirect ke /tracking/[code] agar link dari email bisa diakses.
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');

	if (!code || !code.trim()) {
		throw redirect(302, '/');
	}

	throw redirect(302, `/?code=${code.trim()}`);
};
