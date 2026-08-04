/**
 * Standard API response envelope.
 *
 * Semua endpoint API memakai format yang sama:
 * {
 *   success: boolean,
 *   message: string,
 *   data: T | null,
 *   errors: Record<string, string[]> | null,
 *   meta: { version: string, timestamp: string }
 * }
 */
import { json } from '@sveltejs/kit';

export const API_VERSION = 'v1';

export interface ApiMeta {
	version: string;
	timestamp: string;
}

export interface ApiEnvelope<T = unknown> {
	success: boolean;
	message: string;
	data: T | null;
	errors: Record<string, string[]> | null;
	meta: ApiMeta;
}

function buildMeta(): ApiMeta {
	return {
		version: API_VERSION,
		timestamp: new Date().toISOString()
	};
}

/** Sukses response (200). */
export function ok<T>(data: T, message = 'OK', status = 200) {
	const body: ApiEnvelope<T> = {
		success: true,
		message,
		data,
		errors: null,
		meta: buildMeta()
	};
	return json(body, { status });
}

/** Created response (201). */
export function created<T>(data: T, message = 'Created') {
	return ok(data, message, 201);
}

/** Error response (4xx/5xx). */
export function fail<T = null>(
	message: string,
	status = 400,
	errors: Record<string, string[]> | null = null,
	data: T | null = null
) {
	const body: ApiEnvelope<T> = {
		success: false,
		message,
		data,
		errors,
		meta: buildMeta()
	};
	return json(body, { status });
}

/** Validasi error (422). */
export function validationError(errors: Record<string, string[]>, message = 'Validasi gagal') {
	return fail(message, 422, errors);
}

/** Bad request (400). */
export function badRequest(message = 'Permintaan tidak valid') {
	return fail(message, 400);
}

/** Not found (404). */
export function notFound(message = 'Data tidak ditemukan') {
	return fail(message, 404);
}

/** Unauthorized (401). */
export function unauthorized(message = 'Tidak terautentikasi') {
	return fail(message, 401);
}

/** Forbidden (403). */
export function forbidden(message = 'Tidak memiliki akses') {
	return fail(message, 403);
}

/** Server error (500). */
export function serverError(
	message = 'Terjadi kesalahan internal',
	errors: Record<string, string[]> | null = null
) {
	return fail(message, 500, errors);
}