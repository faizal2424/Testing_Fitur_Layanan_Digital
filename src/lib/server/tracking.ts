/**
 * Tracking Service — single source of truth untuk query pengajuan by tracking code.
 *
 * Dipakai bersama oleh:
 * - API route `/api/tracking/[code]`
 * - Halaman utama `/+page.server.ts` (load `?code=` & action `checkStatus`)
 *
 * Sebelumnya query ini diduplikasi di 3 tempat dengan include yang hampir sama.
 */

import { db } from '$lib/server/db';
import { getPublicStatusLabel } from '$lib/constants/status';

/**
 * Query pengajuan lengkap by tracking code (termasuk layanan, PIC, instansi,
 * dan catatan terakhir).
 *
 * @param code Kode tracking (mis. SVC-20260804-XXXXX)
 */
export async function getTrackingSubmission(code: string) {
	return db.service_submissions.findUnique({
		where: { tracking_code: code },
		include: {
			services: true,
			users: true, // PIC
			agencies: true,
			submission_notes: {
				orderBy: { created_at: 'desc' },
				take: 1
			}
		}
	});
}

/**
 * Format hasil tracking publik untuk halaman utama (modal status).
 * Menambahkan alias `code`, `status_txt`, `service_name`, `pic_phone`
 * yang dipakai frontend `/+page.svelte`.
 */
export function toPublicTrackingResult(
	pengajuan: NonNullable<Awaited<ReturnType<typeof getTrackingSubmission>>>
) {
	return {
		...pengajuan,
		code: pengajuan.tracking_code,
		status_txt: getPublicStatusLabel(pengajuan.status),
		service_name: pengajuan.services.name,
		pic_phone: pengajuan.users?.phone || 'Menunggu Penugasan'
	};
}

/**
 * Serialize data Prisma agar aman dikirim ke client (BigInt → string).
 */
export function serializeForClient<T>(data: T): T {
	return JSON.parse(
		JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
	);
}