import { getFile } from '$lib/server/storage';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Protected file serving endpoint.
 *
 * - Keys under `submissions/{trackingCode}/` (surat permohonan & surat-bukti PDF):
 *   - Accessible by authenticated admin/superadmin/PIC (session).
 *   - Accessible by the applicant when `?code={trackingCode}` matches the
 *     tracking code embedded in the key (link sent via email / success page).
 * - Keys under `evidence/{trackingCode}/`:
 *   - Accessible ONLY by authenticated admin/superadmin/PIC. Never public.
 * - Anything else: 403.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const key = params.path;
	if (!key) throw error(400, 'Path tidak valid.');

	const isEvidence = key.startsWith('evidence/');
	const isSubmission = key.startsWith('submissions/');

	if (!isEvidence && !isSubmission) {
		throw error(403, 'Akses ditolak.');
	}

	// Extract tracking code from key: submissions/SVC-.../file or evidence/SVC-.../file
	const match = /^(?:submissions|evidence)\/([^/]+)\//.exec(key);
	const trackingCode = match?.[1] || null;

	const user = locals.user;
	const isAuthenticatedStaff = !!user && ['admin', 'superadmin', 'pic'].includes(user.role);

	// PIC access check: must own the submission or be on its team.
	async function assertPicAccess(code: string | null): Promise<void> {
		if (!code) throw error(403, 'Akses ditolak.');
		if (!user || user.role !== 'pic') return;
		const { db } = await import('$lib/server/db');
		const submission = await db.service_submissions.findUnique({
			where: { tracking_code: code },
			select: {
				assigned_to: true,
				submission_team_members: { select: { user_id: true } }
			}
		});
		const isPrimary = submission?.assigned_to === BigInt(user.id);
		const isTeam = submission?.submission_team_members.some((m) => m.user_id === BigInt(user.id));
		if (!submission || (!isPrimary && !isTeam)) {
			throw error(403, 'Akses ditolak. Anda bukan PIC pengajuan ini.');
		}
	}

	if (isEvidence) {
		// Evidence is strictly staff-only (admin/superadmin/PIC via session).
		if (!isAuthenticatedStaff) {
			throw error(403, 'Akses ditolak. Hanya staf yang berwenang.');
		}
		await assertPicAccess(trackingCode);
	}

	if (isSubmission) {
		if (isAuthenticatedStaff) {
			await assertPicAccess(trackingCode);
		} else {
			// Applicant fallback: `?code={trackingCode}` must match the key.
			const queryCode = url.searchParams.get('code');
			if (!trackingCode || !queryCode || queryCode !== trackingCode) {
				throw error(403, 'Akses ditolak. Sertakan kode tracking yang valid.');
			}
		}
	}

	const file = await getFile(key);
	if (!file) throw error(404, 'File tidak ditemukan.');

	const isPdf = key.toLowerCase().endsWith('.pdf');
	const contentType =
		file.contentType || (isPdf ? 'application/pdf' : 'application/octet-stream');
	const body = file.body as unknown as BodyInit;

	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Content-Length': file.contentLength?.toString() || '',
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff',
			'Content-Disposition': 'inline'
		}
	});
};