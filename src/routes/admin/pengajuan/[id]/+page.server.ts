import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, parent }) => {
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
		}))
	};
};

export const actions: Actions = {
	// Change status
	changeStatus: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const newStatus = formData.get('status')?.toString();
		const note = formData.get('note')?.toString()?.trim() || null;
		const submissionId = BigInt(params.id);

		if (!newStatus) return fail(400, { error: 'Status tidak valid.' });

		const submission = await db.service_submissions.findUnique({
			where: { id: submissionId },
			select: { status: true }
		});

		if (!submission) return fail(404, { error: 'Pengajuan tidak ditemukan.' });

		const oldStatus = submission.status;

		await db.$transaction([
			db.service_submissions.update({
				where: { id: submissionId },
				data: { status: newStatus, updated_at: new Date() }
			}),
			db.submission_notes.create({
				data: {
					submission_id: submissionId,
					user_id: locals.user?.id || null,
					status_from: oldStatus,
					status_to: newStatus,
					note,
					created_at: new Date(),
					updated_at: new Date()
				}
			})
		]);

		return { success: true, message: `Status berhasil diubah ke "${newStatus}".` };
	},

	// Assign to PIC
	assign: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const picId = formData.get('pic_id')?.toString();
		const submissionId = BigInt(params.id);

		if (!picId) return fail(400, { error: 'Pilih PIC terlebih dahulu.' });

		const submission = await db.service_submissions.findUnique({
			where: { id: submissionId },
			select: { status: true }
		});

		if (!submission) return fail(404, { error: 'Pengajuan tidak ditemukan.' });

		const oldStatus = submission.status;
		const newStatus = oldStatus === 'baru' ? 'ditugaskan' : oldStatus;

		await db.$transaction([
			db.service_submissions.update({
				where: { id: submissionId },
				data: {
					assigned_to: BigInt(picId),
					status: newStatus,
					updated_at: new Date()
				}
			}),
			db.submission_notes.create({
				data: {
					submission_id: submissionId,
					user_id: locals.user?.id || null,
					status_from: oldStatus,
					status_to: newStatus,
					note: 'PIC ditugaskan',
					created_at: new Date(),
					updated_at: new Date()
				}
			})
		]);

		return { success: true, message: 'PIC berhasil ditugaskan.' };
	},

	// Toggle priority
	togglePriority: async ({ params }) => {
		const submissionId = BigInt(params.id);
		const submission = await db.service_submissions.findUnique({
			where: { id: submissionId },
			select: { is_priority: true }
		});

		if (!submission) return fail(404, { error: 'Pengajuan tidak ditemukan.' });

		await db.service_submissions.update({
			where: { id: submissionId },
			data: { is_priority: !submission.is_priority, updated_at: new Date() }
		});

		return { success: true, message: submission.is_priority ? 'Prioritas dicabut.' : 'Ditandai sebagai prioritas.' };
	},

	// Add note
	addNote: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const note = formData.get('note')?.toString()?.trim();
		const submissionId = BigInt(params.id);

		if (!note) return fail(400, { error: 'Catatan tidak boleh kosong.' });

		await db.submission_notes.create({
			data: {
				submission_id: submissionId,
				user_id: locals.user?.id || null,
				note,
				created_at: new Date(),
				updated_at: new Date()
			}
		});

		return { success: true, message: 'Catatan berhasil ditambahkan.' };
	}
};
