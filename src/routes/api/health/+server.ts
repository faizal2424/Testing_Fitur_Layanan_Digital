import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/health — health check
export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		service: 'Digital Services API',
		timestamp: new Date().toISOString(),
		version: '1.0.0'
	});
};