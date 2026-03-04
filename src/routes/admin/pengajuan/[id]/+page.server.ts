import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { getAllowedStatuses } from '$lib/utils/submissionFlow';

export const load: PageServerLoad = async ({ params, parent, locals }) => {
	const parentData = await parent();
	const submissionId = BigInt(params.id);

	const submission = await db.service_submissions.findUnique({
		where: { id: submissionId },
		include: {
			services: { select: { id: true, name: true, icon: true } },
			users: { select: { id: true, name: true } },
			service_submission_values: {
				include: { service_form_fields: { select: { label: true, name: true, type: true } } },
				orderBy: { service_form_fields: { order: 'asc' } }
			},
			submission_notes: {
				include: { users: { select: { name: true } } },
				orderBy: { created_at: 'desc' }
			}
		}
	});

	if (!submission) {
		return { submission: null, picUsers: [], values: [], notes: [] };
	}

	// PIC Access Control: only allow if assigned to this PIC
	const user = locals.user;
	if (user?.role === 'pic' && submission.assigned_to !== BigInt(user.id)) {
		throw error(403, 'Anda tidak memiliki akses ke pengajuan ini.');
	}

	// Get PIC users for assignment
	const picUsers = await db.users.findMany({
		where: {
			user_roles: { some: { roles: { name: { in: ['pic', 'admin', 'superadmin'] } } } }
		},
		select: { id: true, name: true, email: true }
	});

	return {
		submission: {
			id: submission.id.toString(),
			applicant_name: submission.applicant_name || '-',
			applicant_email: submission.applicant_email || '-',
			status: submission.status,
			tracking_code: submission.tracking_code,
			is_priority: submission.is_priority,
			assigned_to: submission.assigned_to?.toString() || null,
			assigned_to_name: submission.users?.name || null,
			service_id: submission.services.id.toString(),
			service_name: submission.services.name,
			service_icon: submission.services.icon,
			created_at: submission.created_at?.toISOString() || null,
			updated_at: submission.updated_at?.toISOString() || null
		},
		values: submission.service_submission_values.map((v) => ({
			id: v.id.toString(),
			label: v.service_form_fields.label,
			name: v.service_form_fields.name,
			type: v.service_form_fields.type,
			value: v.value,
			file_path: v.file_path
		})),
		notes: submission.submission_notes.map((n) => ({
			id: n.id.toString(),
			status_from: n.status_from,
			status_to: n.status_to,
			note: n.note,
			user_name: n.users?.name || 'Sistem',
			created_at: n.created_at?.toISOString() || null
		})),
		picUsers: picUsers.map((u) => ({
			id: u.id.toString(),
			name: u.name,
			email: u.email
		})),
		allowedStatuses: getAllowedStatuses(submission.status, locals.user?.role || ''),
		userRole: locals.user?.role || ''
	};
};

export const actions: Actions = {
	// Process all changes in one form
	process: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const newStatus = formData.get('status')?.toString();
		const picIdStr = formData.get('pic_id')?.toString();
		const isPriorityStr = formData.get('is_priority')?.toString(); // 'true' or 'false' or undefined
		const note = formData.get('note')?.toString()?.trim() || null;
		
		const submissionId = BigInt(params.id);

		if (!newStatus) return fail(400, { error: 'Status tidak valid.' });

		const submission = await db.service_submissions.findUnique({
			where: { id: submissionId },
			select: { status: true, is_priority: true, assigned_to: true }
		});

		if (!submission) return fail(404, { error: 'Pengajuan tidak ditemukan.' });

		const oldStatus = submission.status;
		const userRole = locals.user?.role || '';
		const newPicId = picIdStr ? BigInt(picIdStr) : null;
		const newIsPriority = isPriorityStr === 'on' || isPriorityStr === 'true'; // checkboxes often post 'on'

		// If status is changing, check validations
		if (newStatus !== oldStatus) {
			const allowedStatuses = getAllowedStatuses(oldStatus, userRole);
			if (!allowedStatuses.includes(newStatus)) {
				return fail(400, { error: 'Transisi status tidak diizinkan untuk peran Anda.' });
			}

			if (userRole === 'pic' && submission.is_priority && newStatus === 'ditolak_pic') {
				return fail(400, { error: 'Pengajuan prioritas tinggi tidak boleh ditolak.' });
			}
		}

		// Validation: if status is ditugaskan, there must be a PIC
		if (newStatus === 'ditugaskan' && !newPicId) {
			return fail(400, { error: 'PIC wajib ditempatkan ketika status adalah ditugaskan.' });
		}

		// Priority locking logic
		const isAssignmentPhase = (oldStatus === 'baru' || oldStatus === 'ditolak_pic') && newStatus === 'ditugaskan';
		const canChangePriority = (userRole === 'admin' || userRole === 'superadmin') && isAssignmentPhase;

		await db.$transaction([
			db.service_submissions.update({
				where: { id: submissionId },
				data: { 
					status: newStatus, 
					assigned_to: newStatus === 'ditugaskan' ? newPicId : submission.assigned_to,
					is_priority: canChangePriority ? newIsPriority : submission.is_priority,
					updated_at: new Date() 
				}
			}),
			db.submission_notes.create({
				data: {
					submission_id: submissionId,
					user_id: locals.user?.id || null,
					status_from: oldStatus,
					status_to: newStatus !== oldStatus ? newStatus : null, // only log status transition if it actually changed
					note,
					created_at: new Date(),
					updated_at: new Date()
				}
			})
		]);

		return { success: true, message: 'Pengajuan berhasil diproses dan diperbarui.' };
	}
};
