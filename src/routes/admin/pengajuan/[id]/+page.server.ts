import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { NotificationService } from '$lib/server/notifications';
import { getAllowedStatuses } from '$lib/utils/submissionFlow';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
			},
			submission_team_members: {
				include: { users: { select: { id: true, name: true } } }
			}
		}
	});

	if (!submission) {
		return { submission: null, picUsers: [], values: [], notes: [] };
	}

	// PIC Access Control: only allow if Primary PIC or Team Member
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	
	const isPrimaryPic = user.role === 'pic' && submission.assigned_to === BigInt(user.id);
	const isTeamMember = submission.submission_team_members.some(
		(tm) => tm.user_id === BigInt(user.id)
	);

	if (user.role === 'pic' && !isPrimaryPic && !isTeamMember) {
		throw error(403, 'Anda tidak memiliki akses ke pengajuan ini.');
	}

	const isAssistantOnly = user?.role === 'pic' && !isPrimaryPic && isTeamMember;

	// PIC Utama users (Only role 'pic')
	const picUsers = await db.users.findMany({
		where: {
			user_roles: { some: { roles: { name: 'pic' } } }
		},
		select: { id: true, name: true, email: true }
	});

	// Assistant PICs (Only role 'pic')
	const assistantPICs = await db.users.findMany({
		where: {
			user_roles: { some: { roles: { name: 'pic' } } }
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
		notes: submission.submission_notes.map((n: any) => ({
			id: n.id.toString(),
			status_from: n.status_from,
			status_to: n.status_to,
			note: n.note,
			file_path: n.file_path,
			user_name: n.users?.name || 'Sistem',
			created_at: n.created_at?.toISOString() || null
		})),
		picUsers: picUsers.map((u) => ({
			id: u.id.toString(),
			name: u.name,
			email: u.email
		})),
		assistantPICs: assistantPICs.map((u) => ({
			id: u.id.toString(),
			name: u.name,
			email: u.email
		})),
		teamMembers: submission.submission_team_members.map((tm) => ({
			id: tm.users.id.toString(),
			name: tm.users.name
		})),
		allowedStatuses: getAllowedStatuses(submission.status, locals.user?.role || ''),
		userRole: locals.user?.role || '',
		isAssistantOnly
	};
};

export const actions: Actions = {
	// Process all changes in one form
	process: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const newStatus = formData.get('status')?.toString();
		const picIdStr = formData.get('pic_id')?.toString();
		const teamMemberIds = formData.getAll('team_members').map((id) => id.toString());
		const isPriorityStr = formData.get('is_priority')?.toString(); // 'true' or 'false' or undefined
		const note = formData.get('note')?.toString()?.trim() || null;
		const evidence = formData.get('evidence') as File | null;
		
		const submissionId = BigInt(params.id);

		if (!newStatus) return fail(400, { error: 'Status tidak valid.' });

		const submission = await db.service_submissions.findUnique({
			where: { id: submissionId },
			select: { 
				status: true, 
				is_priority: true, 
				assigned_to: true,
				tracking_code: true,
				submission_team_members: {
					select: { user_id: true }
				}
			}
		});

		if (!submission) return fail(404, { error: 'Pengajuan tidak ditemukan.' });

		try {
			const oldStatus = submission.status;
		const user = locals.user;
		if (!user) return fail(401, { error: 'Unauthorized' });
		
		const userRole = user.role || '';
		
		// Access Check for PIC
		const isPrimaryPic = userRole === 'pic' && submission.assigned_to === BigInt(user.id);
		const isTeamMember = submission.submission_team_members.some(
			(tm) => tm.user_id === BigInt(user.id)
		);

		if (userRole === 'pic') {
			if (!isPrimaryPic && !isTeamMember) {
				return fail(403, { error: 'Akses ditolak.' });
			}
			if (!isPrimaryPic && isTeamMember) {
				return fail(403, { error: 'Anggota tim (asisten) tidak dapat melakukan aksi pemrosesan.' });
			}
		}

		// Fetch PIC users for dynamic messaging
		const picUsers = await db.users.findMany({
			where: {
				user_roles: { some: { roles: { name: 'pic' } } }
			},
			select: { id: true, name: true }
		});

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
		} else {
			return fail(400, { error: 'Status belum diubah. Silakan pilih status baru sebelum menyimpan perubahan.' });
		}

		// Validation: evidence is required if status is diselesaikan_pic
		if (newStatus === 'diselesaikan_pic' && (!evidence || evidence.size === 0)) {
			return fail(400, { error: 'Bukti gambar laporan wajib diunggah untuk menyelesaikan pengajuan.' });
		}

		// Validation: if status is ditugaskan, there must be a PIC
		if (newStatus === 'ditugaskan' && !newPicId) {
			return fail(400, { error: 'PIC wajib ditempatkan ketika status adalah ditugaskan.' });
		}

		// Priority locking logic
		const isAssignmentPhase = (oldStatus === 'baru' || oldStatus === 'ditolak_pic') && newStatus === 'ditugaskan';
		const canChangePriority = (userRole === 'admin' || userRole === 'superadmin') && isAssignmentPhase;

		// Handle file upload if present
		let evidencePath: string | null = null;
		if (evidence && evidence.size > 0) {
			const uploadDir = join(process.cwd(), 'static', 'uploads', 'evidence', submission.tracking_code);
			await mkdir(uploadDir, { recursive: true });

			const fileName = `evidence_${Date.now()}_${evidence.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
			const fullPath = join(uploadDir, fileName);

			const arrayBuffer = await evidence.arrayBuffer();
			await writeFile(fullPath, Buffer.from(arrayBuffer));
			evidencePath = `/uploads/evidence/${submission.tracking_code}/${fileName}`;
		}

		// Perform updates sequentially to isolate errors
		// 1. Update matching status
		await db.service_submissions.update({
			where: { id: submissionId },
			data: { 
				status: newStatus, 
				assigned_to: newStatus === 'ditugaskan' ? newPicId : submission.assigned_to,
				is_priority: canChangePriority ? newIsPriority : submission.is_priority,
				updated_at: new Date() 
			}
		});

		// 2. Create note
		await db.submission_notes.create({
			data: {
				submission_id: submissionId,
				user_id: locals.user?.id || null,
				status_from: oldStatus,
				status_to: newStatus !== oldStatus ? newStatus : null,
				note,
				file_path: evidencePath,
				created_at: new Date(),
				updated_at: new Date()
			} as any
		});

		// 3. Sync team members
		if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'pic') {
			await db.submission_team_members.deleteMany({
				where: { submission_id: submissionId }
			});
			
			if (teamMemberIds.length > 0) {
				await db.submission_team_members.createMany({
					data: teamMemberIds.map(id => ({
						submission_id: submissionId,
						user_id: BigInt(id)
					}))
				});
			}
		}

		// Send notification for status change or assignment
		let notifTitle = 'Update Status Pengajuan';
		let notifMessage = `Pengajuan ${submission.tracking_code} telah diubah statusnya menjadi "${newStatus.replace('_', ' ').toUpperCase()}".`;
		let adminNotifMessage = `Pengajuan ${submission.tracking_code} telah diubah statusnya menjadi "${newStatus.replace('_', ' ').toUpperCase()}" oleh ${user.name}.`;
		let targetUserId: bigint | undefined = undefined;

		if (newStatus === 'ditugaskan' && newPicId) {
			const assignedPic = picUsers.find((u) => u.id === newPicId);
			const picName = assignedPic?.name || 'PIC';
			
			notifTitle = 'Penugasan Pengajuan Baru';
			notifMessage = `Anda telah ditugaskan untuk memproses pengajuan ${submission.tracking_code}.`;
			adminNotifMessage = `${picName} telah ditugaskan untuk memproses pengajuan ${submission.tracking_code}.`;
			targetUserId = newPicId;
		} else if (submission.assigned_to) {
			if (submission.assigned_to !== BigInt(user.id)) {
				targetUserId = submission.assigned_to;
			}
		}

		await NotificationService.send({
			userId: targetUserId,
			title: notifTitle,
			message: notifMessage,
			adminMessage: adminNotifMessage,
			type: 'info',
			link: `/admin/pengajuan/${submissionId}`
		});

		return { success: true, message: 'Pengajuan berhasil diproses dan diperbarui.' };
		} catch (err: any) {
			console.error('Process action error details:', err);
			const errorMessage = err.message || 'Gagal memproses data';
			return fail(500, { error: `Terjadi kesalahan saat menyimpan: ${errorMessage}` });
		}
	}
};
