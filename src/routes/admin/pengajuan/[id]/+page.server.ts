import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { getAllowedStatuses } from '$lib/utils/submissionFlow';
import { enqueueNotification, enqueueEventEmail } from '$lib/server/jobs';
import { getNotificationPolicy } from '$lib/server/notification-policy';
import {
	picTaskTemplate,
	adminValidationTemplate,
	submissionCompletedTemplate,
	revisionRequestedTemplate,
	picRejectedTemplate,
	submissionRejectedTemplate
} from '$lib/server/email-templates';
import { requireSubmissionAccess, canAccessSubmission } from '$lib/server/auth';
import { putFile, evidenceKey, toPublicUrl, resolveFileUrl } from '$lib/server/storage';

export const load: PageServerLoad = async (event) => {
	const { params, locals } = event;
	const submissionId = BigInt(params.id);

	const submission = await db.service_submissions.findUnique({
		where: { id: submissionId },
		include: {
			services: { 
				select: { 
					id: true, 
					name: true, 
					icon: true, 
					agency_id: true,
					pic_id: true,
					pic: { select: { name: true } },
					agencies: { select: { name: true } }
				} 
			},
			agencies: { select: { id: true, name: true } },
			users: { select: { id: true, name: true } },
			service_submission_values: {
				include: { service_form_fields: { select: { label: true, name: true, type: true, options: true } } },
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

	// Access Control: superadmin bypasses, admin (OPD) must own the agency,
	// PIC must be primary PIC or team member.
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	requireSubmissionAccess(event, submission);

	const isPrimaryPic = user.role === 'pic' && submission.assigned_to === BigInt(user.id);
	const isTeamMember = submission.submission_team_members.some(
		(tm) => tm.user_id === BigInt(user.id)
	);

	const isAssistantOnly = user?.role === 'pic' && !isPrimaryPic && isTeamMember;

	// Filter PIC hanya dari OPD yang sama dengan submission
	// Fallback ke services.agency_id jika submission.agency_id null
	const targetAgencyId = submission.agency_id || submission.services.agency_id;
	const agencyFilter = targetAgencyId
		? { agency_id: targetAgencyId }
		: {};

	// PIC Utama users — hanya dari OPD terkait
	const picUsers = await db.users.findMany({
		where: {
			user_roles: { some: { roles: { name: 'pic' } } },
			...agencyFilter
		},
		select: { id: true, name: true, email: true }
	});

	// Assistant PICs — hanya dari OPD terkait
	const assistantPICs = await db.users.findMany({
		where: {
			user_roles: { some: { roles: { name: 'pic' } } },
			...agencyFilter
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
			service_pic_id: submission.services.pic_id?.toString() || null,
			service_pic_name: submission.services.pic?.name || null,
			agency_name: submission.agencies?.name || submission.services.agencies?.name || null,
			created_at: submission.created_at?.toISOString() || null,
			updated_at: submission.updated_at?.toISOString() || null
		},
		values: submission.service_submission_values.map((v) => {
			let displayValue = v.value;
			if (v.service_form_fields.type === 'select' && v.service_form_fields.options && v.value) {
				try {
					const opts = JSON.parse(v.service_form_fields.options);
					const matched = opts.find((opt: any) => opt.value === String(v.value));
					if (matched && matched.label) {
						displayValue = matched.label;
					}
				} catch (e) {}
			}
			return {
				id: v.id.toString(),
				label: v.service_form_fields.label,
				name: v.service_form_fields.name,
				type: v.service_form_fields.type,
				value: displayValue,
				file_path: resolveFileUrl(v.file_path)
			};
		}),
		notes: submission.submission_notes.map((n: any) => ({
			id: n.id.toString(),
			status_from: n.status_from,
			status_to: n.status_to,
			note: n.note,
			file_path: resolveFileUrl(n.file_path),
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
	process: async (event) => {
		const { request, params, locals } = event;
		const formData = await request.formData();
		const newStatus = formData.get('status')?.toString();
		const teamMemberIds = formData.getAll('team_members').map((id) => id.toString());
		const isPriorityStr = formData.get('is_priority')?.toString();
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
				service_id: true,
				agency_id: true,
				applicant_name: true,
				applicant_email: true,
				services: {
					select: {
						agency_id: true,
						pic_id: true,
						name: true
					}
				},
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
		
		// Access Check for processing:
		// - superadmin: allowed
		// - admin (OPD): must own the submission's agency
		// - pic: must be the primary PIC (team members cannot process)
		if (userRole === 'pic') {
			const isPrimaryPic = submission.assigned_to === BigInt(user.id);
			if (!isPrimaryPic) {
				const isTeamMember = submission.submission_team_members.some(
					(tm) => tm.user_id === BigInt(user.id)
				);
				if (!isTeamMember) {
					return fail(403, { error: 'Akses ditolak.' });
				}
				return fail(403, { error: 'Anggota tim (asisten) tidak dapat melakukan aksi pemrosesan.' });
			}
		} else if (userRole === 'admin' && !canAccessSubmission(user, submission)) {
			return fail(403, { error: 'Tidak diizinkan memproses pengajuan instansi lain.' });
		}

		// Priority locking logic: only admin/superadmin can change it, and only when current status is 'baru' or 'ditugaskan'
		const canChangePriority = (userRole === 'admin' || userRole === 'superadmin') && (submission.status === 'baru' || submission.status === 'ditugaskan');
		const newIsPriority = canChangePriority
			? (isPriorityStr === 'on' || isPriorityStr === 'true')
			: submission.is_priority;

		const statusChanged = newStatus !== oldStatus;
		const priorityChanged = newIsPriority !== submission.is_priority;

		if (!statusChanged && !priorityChanged) {
			return fail(400, { error: 'Tidak ada perubahan yang dilakukan.' });
		}

		// If status is changing, check validations
		if (statusChanged) {
			const allowedStatuses = getAllowedStatuses(oldStatus, userRole);
			if (!allowedStatuses.includes(newStatus)) {
				return fail(400, { error: 'Transisi status tidak diizinkan untuk peran Anda.' });
			}

			if (userRole === 'pic' && submission.is_priority && newStatus === 'ditolak_pic') {
				return fail(400, { error: 'Pengajuan prioritas tinggi tidak boleh ditolak.' });
			}
		}

		// Validation: evidence is required if status is diselesaikan_pic
		if (newStatus === 'diselesaikan_pic' && (!evidence || evidence.size === 0)) {
			return fail(400, { error: 'Bukti gambar laporan wajib diunggah untuk menyelesaikan pengajuan.' });
		}


		// Handle file upload if present
		let evidencePath: string | null = null;
		if (evidence && evidence.size > 0) {
			const fileName = `evidence_${Date.now()}_${evidence.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
			const key = evidenceKey(submission.tracking_code, fileName);

			const arrayBuffer = await evidence.arrayBuffer();
			await putFile(key, Buffer.from(arrayBuffer), evidence.type || undefined);
			evidencePath = toPublicUrl(key);
		}

		// Prepare database update details
		const updateData: any = {
			status: newStatus,
			is_priority: canChangePriority ? newIsPriority : submission.is_priority,
			updated_at: new Date()
		};

		let assignedPicName = '';
		let targetPicId: bigint | null = null;

		const isAssigningToPic =
			newStatus === 'ditugaskan' &&
			(oldStatus === 'baru' || oldStatus === 'sudah_direvisi' || oldStatus === 'ditolak_pic');
		if (isAssigningToPic) {
			const servicePicId = submission.services.pic_id;
			if (servicePicId) {
				targetPicId = servicePicId;
				const picUser = await db.users.findUnique({
					where: { id: targetPicId },
					select: { name: true }
				});
				assignedPicName = picUser?.name || 'PIC';
			} else {
				const assignedPicIdStr = formData.get('assigned_pic_id')?.toString();
				if (!assignedPicIdStr) {
					return fail(400, { error: 'PIC harus dipilih untuk menugaskan pengajuan ini.' });
				}
				targetPicId = BigInt(assignedPicIdStr);
				const picUser = await db.users.findUnique({
					where: { id: targetPicId },
					select: { name: true }
				});
				assignedPicName = picUser?.name || 'PIC';
			}
			updateData.assigned_to = targetPicId;
		}

		// 1. Update status & PIC assignment
		await db.service_submissions.update({
			where: { id: submissionId },
			data: updateData
		});

		// 2. Format note text
		const customNote = note || '';
		let finalNote = customNote;
		if (isAssigningToPic && assignedPicName) {
			const isReassign = oldStatus === 'ditolak_pic';
			const assignmentMessage = isReassign
				? `Pengajuan ditugaskan ulang kepada PIC: ${assignedPicName}`
				: (submission.services.pic_id 
					? `Pengajuan otomatis ditugaskan kepada PIC: ${assignedPicName}`
					: `Pengajuan ditugaskan kepada PIC: ${assignedPicName}`);
			finalNote = customNote 
				? `${assignmentMessage}. Catatan: ${customNote}`
				: assignmentMessage;
		}

		// Create note
		await db.submission_notes.create({
			data: {
				submission_id: submissionId,
				user_id: locals.user?.id || null,
				status_from: oldStatus,
				status_to: newStatus !== oldStatus ? newStatus : null,
				note: finalNote || null,
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

		// ── Policy-driven notifikasi & email (E2..E8) ──
		const policy = getNotificationPolicy(oldStatus, newStatus);
		if (policy) {
			const origin = event.url.origin;
			const serviceName = submission.services.name;
			const trackingCode = submission.tracking_code;
			const applicantName = submission.applicant_name || null;
			const applicantEmail = submission.applicant_email || null;
			const picUserId = targetPicId ?? submission.assigned_to ?? undefined;

			const notifMessage = `Pengajuan ${trackingCode} telah diubah statusnya menjadi "${newStatus.replace(/_/g, ' ').toUpperCase()}".`;
			const adminNotifMessage = `Pengajuan ${trackingCode} telah diubah statusnya menjadi "${newStatus.replace(/_/g, ' ').toUpperCase()}" oleh ${user.name}.`;

			// In-app per policy:
			// - policy.inapp includes 'pic' → kirim ke Admin + PIC (both)
			// - policy.inapp hanya admin → kirim ke semua Admin (admins)
			// - policy.inapp 'pengaju' ditiadakan di in-app (pengaju eksternal tanpa akun sistem)
			if (policy.inapp.length > 0) {
				if (policy.inapp.includes('pic') && picUserId) {
					await enqueueNotification({
						userId: picUserId,
						title: policy.inappTitle,
						message: notifMessage,
						adminMessage: adminNotifMessage,
						type: policy.inappType,
						link: `/admin/pengajuan/${submissionId}`,
						recipients: 'both'
					});
				} else if (policy.inapp.includes('admin')) {
					await enqueueNotification({
						title: policy.inappTitle,
						message: notifMessage,
						adminMessage: adminNotifMessage,
						type: policy.inappType,
						link: `/admin/pengajuan/${submissionId}`,
						recipients: 'admins'
					});
				}
			}

			// ── Email real-time: PIC (E2) ──
			if (policy.email.includes('pic') && targetPicId) {
				const picUser = await db.users.findUnique({
					where: { id: targetPicId },
					select: { email: true }
				});
				if (picUser?.email) {
					await enqueueEventEmail({
						submissionId,
						eventType: policy.eventKey,
						recipientRole: 'pic',
						recipientEmail: picUser.email,
						mailOptions: {
							to: picUser.email,
							subject: `[Tugas Baru] ${serviceName} — ${trackingCode}`,
							html: picTaskTemplate({
								picName: assignedPicName || null,
								serviceName,
								trackingCode,
								note: finalNote || null,
								detailUrl: `${origin}/admin/pengajuan/${submissionId}`
							})
						}
					});
				}
			}

			// ── Email real-time: Admin (E4 & E7) ──
			if (policy.email.includes('admin')) {
				const admins = await db.users.findMany({
					where: {
						user_roles: {
							some: {
								roles: {
									name: { in: ['admin', 'superadmin', 'Admin', 'Superadmin'] }
								}
							}
						}
					},
					select: { email: true }
				});

				for (const admin of admins) {
					if (!admin.email) continue;

					let subject: string;
					let html: string;

					if (newStatus === 'diselesaikan_pic') {
						// E4 — PIC selesai → Admin validasi
						subject = `[Validasi] PIC Menyelesaikan — ${serviceName} (${trackingCode})`;
						html = adminValidationTemplate({
							serviceName,
							applicantName,
							trackingCode,
							note: finalNote || null,
							adminUrl: `${origin}/admin/pengajuan/${submissionId}`
						});
					} else if (newStatus === 'ditolak_pic') {
						// E7 — Ditolak PIC → Admin tindak lanjut
						subject = `[Perlu Tindakan] Pengajuan Ditolak PIC — ${serviceName} (${trackingCode})`;
						html = picRejectedTemplate({
							serviceName,
							applicantName,
							trackingCode,
							note: finalNote || null,
							adminUrl: `${origin}/admin/pengajuan/${submissionId}`
						});
					} else {
						subject = `[Notifikasi] ${policy.inappTitle} — ${serviceName} (${trackingCode})`;
						html = adminValidationTemplate({
							serviceName,
							applicantName,
							trackingCode,
							note: finalNote || null,
							adminUrl: `${origin}/admin/pengajuan/${submissionId}`
						});
					}

					await enqueueEventEmail({
						submissionId,
						eventType: policy.eventKey,
						recipientRole: 'admin',
						recipientEmail: admin.email,
						mailOptions: { to: admin.email, subject, html }
					});
				}
			}

			// ── Email real-time: Pengaju (E5, E6, E8) ──
			if (policy.email.includes('pengaju') && applicantEmail) {
				let subject: string;
				let html: string;

				if (newStatus === 'selesai') {
					// E5 — Selesai final
					subject = `Permohonan Selesai — ${serviceName} (${trackingCode})`;
					html = submissionCompletedTemplate({
						name: applicantName || 'Pemohon',
						serviceName,
						trackingCode,
						trackingUrl: `${origin}/?code=${trackingCode}`,
						suratBuktiUrl: `${origin}/api/surat-bukti/${trackingCode}`
					});
				} else if (newStatus === 'revisi') {
					// E6 — Revisi diminta
					subject = `[Perlu Tindakan] Permohonan Perlu Revisi — ${serviceName} (${trackingCode})`;
					html = revisionRequestedTemplate({
						name: applicantName || 'Pemohon',
						serviceName,
						trackingCode,
						note: finalNote || null,
						trackingUrl: `${origin}/form/${submission.service_id}?code=${trackingCode}`
					});
				} else if (newStatus === 'ditolak_pengajuan') {
					// E8 — Ditolak final
					subject = `Keputusan Permohonan — ${serviceName} (${trackingCode})`;
					html = submissionRejectedTemplate({
						name: applicantName || 'Pemohon',
						serviceName,
						trackingCode,
						note: finalNote || null,
						trackingUrl: `${origin}/?code=${trackingCode}`
					});
				} else {
					subject = `[Notifikasi] ${policy.inappTitle} — ${serviceName} (${trackingCode})`;
					html = submissionCompletedTemplate({
						name: applicantName || 'Pemohon',
						serviceName,
						trackingCode,
						trackingUrl: `${origin}/?code=${trackingCode}`
					});
				}

				await enqueueEventEmail({
					submissionId,
					eventType: policy.eventKey,
					recipientRole: 'pengaju',
					recipientEmail: applicantEmail,
					mailOptions: { to: applicantEmail, subject, html }
				});
			}
		}

		return { success: true, message: 'Pengajuan berhasil diproses dan diperbarui.' };
		} catch (err: any) {
			console.error('Process action error details:', err);
			const errorMessage = err.message || 'Gagal memproses data';
			return fail(500, { error: `Terjadi kesalahan saat menyimpan: ${errorMessage}` });
		}
	}
};
