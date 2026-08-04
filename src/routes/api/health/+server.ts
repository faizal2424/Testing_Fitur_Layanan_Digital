import { ok } from '$lib/server/api-response';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

// GET /api/health — health check dengan status database
export const GET: RequestHandler = async () => {
	let database = 'up';
	try {
		await db.$queryRawUnsafe('SELECT 1');
	} catch {
		database = 'down';
	}

	return ok(
		{
			status: 'ok',
			service: 'Digital Services API',
			database,
			version: '1.0.0'
		},
		'Healthy'
	);
};