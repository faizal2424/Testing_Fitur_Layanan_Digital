import { ok, badRequest, notFound, serverError } from '$lib/server/api-response';
import type { RequestHandler } from './$types';
import { getTrackingSubmission } from '$lib/server/tracking';
import { getPublicStatusLabel } from '$lib/constants/status';

// GET /api/tracking/:code — endpoint publik
export const GET: RequestHandler = async ({ params }) => {
	const code = params.code?.trim();

	if (!code) {
		return badRequest('Kode tracking tidak boleh kosong.');
	}

	try {
		const pengajuan = await getTrackingSubmission(code);

		if (!pengajuan) {
			return notFound('Data tidak ditemukan. Pastikan kode tracking benar.');
		}

		const lastNote = pengajuan.submission_notes[0];

		return ok({
			tracking_code: pengajuan.tracking_code,
			status: pengajuan.status,
			status_label: getPublicStatusLabel(pengajuan.status),
			applicant_name: pengajuan.applicant_name || '-',
			applicant_email: pengajuan.applicant_email || '-',
			service_name: pengajuan.services.name,
			service_icon: pengajuan.services.icon,
			agency_name: pengajuan.agencies?.name || null,
			pic_name: pengajuan.users?.name || 'Menunggu Penugasan',
			pic_phone: pengajuan.users?.phone || null,
			is_priority: pengajuan.is_priority,
			created_at: pengajuan.created_at?.toISOString() || null,
			updated_at: pengajuan.updated_at?.toISOString() || null,
			last_note: lastNote
				? {
						note: lastNote.note,
						status_from: lastNote.status_from,
						status_to: lastNote.status_to,
						created_at: lastNote.created_at?.toISOString() || null
					}
				: null
		});
	} catch (err) {
		console.error('[Tracking] Error:', err);
		return serverError('Terjadi kesalahan pada server.');
	}
};