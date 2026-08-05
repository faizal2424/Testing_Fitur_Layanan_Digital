import { db } from '$lib/server/db';
import {
	submissionReceivedTemplate,
	adminVerificationTemplate
} from '$lib/server/email-templates';
import { enqueueEventEmail, enqueueNotification } from '$lib/server/jobs';
import { getNotificationPolicy } from '$lib/server/notification-policy';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { putFile, submissionKey, toPublicUrl } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params, url }) => {
	const serviceId = BigInt(params.id);

	const service = await db.services.findUnique({
		where: { id: serviceId },
		include: {
			service_form_fields: {
				orderBy: { order: 'asc' }
			}
		}
	});

	if (!service) {
		throw error(404, 'Layanan tidak ditemukan');
	}

	// Baca kode tracking dari link revisi (email E6 mengirim `?code=<tracking_code>`)
	const trackingCode = url.searchParams.get('code');
	let existing: {
		trackingCode: string;
		values: Record<string, { value: string | null; filePath: string | null }>;
	} | null = null;

	if (trackingCode) {
		const submission = await db.service_submissions.findUnique({
			where: { tracking_code: trackingCode },
			include: {
				service_submission_values: true
			}
		});

		// Link revisi harus mengarah ke layanan yang sama & pengajuan berstatus "Perlu Revisi"
		if (submission && submission.service_id === serviceId && submission.status === 'revisi') {
			const values: Record<string, { value: string | null; filePath: string | null }> = {};
			for (const v of submission.service_submission_values) {
				values[String(v.field_id)] = {
					value: v.value ?? null,
					filePath: v.file_path ?? null
				};
			}
			existing = { trackingCode, values };
		}
	}

	// Serialize BigInt values
	const serialized = JSON.parse(
		JSON.stringify(service, (key, value) =>
			typeof value === 'bigint' ? value.toString() : value
		)
	);

	return { service: serialized, existing };
};

function generateTrackingCode(): string {
	const now = new Date();
	const date = now.toISOString().slice(0, 10).replace(/-/g, '');
	const random = Math.random().toString(36).substring(2, 7).toUpperCase();
	return `SVC-${date}-${random}`;
}

type ExistingSubmission = {
	id: bigint;
	service_id: bigint;
	tracking_code: string;
	status: string;
	applicant_name: string | null;
	applicant_email: string | null;
	service_submission_values: {
		field_id: bigint;
		value: string | null;
		file_path: string | null;
	}[];
};

export const actions: Actions = {
	submit: async ({ request, params, url }) => {
		const formData = await request.formData();
		const serviceId = BigInt(params.id);

		// Kode tracking dari link revisi:
		// Prioritas 1 — dari hidden input di form body (dikirim via use:enhance fetch)
		// Prioritas 2 — dari URL query param (fallback untuk submit biasa tanpa JS)
		const revisionCode =
			formData.get('revision_code')?.toString().trim() || url.searchParams.get('code');

		// Get the service and its fields
		const service = await db.services.findUnique({
			where: { id: serviceId },
			include: {
				service_form_fields: {
					orderBy: { order: 'asc' }
				},
				pic: {
					select: { id: true, name: true }
				}
			}
		});

		if (!service) {
			return fail(404, { message: 'Layanan tidak ditemukan' });
		}

		// Jika datang dari link revisi, muat data lama untuk validasi & update
		let existingSubmission: ExistingSubmission | null = null;

		if (revisionCode) {
			existingSubmission = (await db.service_submissions.findUnique({
				where: { tracking_code: revisionCode },
				include: { service_submission_values: true }
			})) as ExistingSubmission | null;

			if (!existingSubmission) {
				return fail(404, { message: 'Pengajuan revisi tidak ditemukan' });
			}
			if (existingSubmission.service_id !== serviceId) {
				return fail(400, { message: 'Link revisi tidak valid untuk layanan ini' });
			}
			if (existingSubmission.status !== 'revisi') {
				return fail(400, {
					message: 'Pengajuan ini sudah tidak berstatus "Perlu Revisi". Silakan hubungi admin.'
				});
			}
		}

		// Auto-detect applicant name & email from dynamic fields
		let applicantName: string | null = null;
		let applicantEmail: string | null = null;

		for (const field of service.service_form_fields) {
			const val = formData.get(`field_${field.id}`)?.toString().trim();
			if (!val) continue;
			if (field.type === 'email' || field.name.toLowerCase().includes('email')) {
				applicantEmail = applicantEmail || val;
			}
			if (field.name.toLowerCase().includes('nama') || field.name.toLowerCase().includes('name')) {
				applicantName = applicantName || val;
			}
		}

		// Saat revisi, nilai lama dipertahankan untuk field yang tidak diisi ulang
		const oldValues = new Map<bigint, { value: string | null; file_path: string | null }>();
		if (existingSubmission) {
			for (const v of existingSubmission.service_submission_values) {
				oldValues.set(v.field_id, { value: v.value, file_path: v.file_path });
			}
		}

		// Validate fields
		const errors: Record<string, string> = {};
		for (const field of service.service_form_fields) {
			const value = formData.get(`field_${field.id}`);
			const stringValue = typeof value === 'string' ? value.trim() : '';

			// Required check
			if (field.is_required) {
				if (!value || (typeof value === 'string' && !value.trim())) {
					errors[`field_${field.id}`] = `${field.label} wajib diisi`;
				}
				// Check file uploads — pada revisi, file lama dipertahankan jika tidak diunggah ulang
				if (field.type === 'file') {
					const file = value as File | null;
					const clearOldFile =
						existingSubmission && formData.get(`field_${field.id}_clear_file`) === '1';
					const hasOldFile =
						existingSubmission && oldValues.get(field.id)?.file_path && !clearOldFile;
					if ((!file || file.size === 0) && !hasOldFile) {
						errors[`field_${field.id}`] = `${field.label} wajib diunggah`;
					}
				}
			}

			// Phone number specific validation
			if (field.type === 'numbertelp' && stringValue) {
				if (!/^0[0-9]{9,14}$/.test(stringValue)) {
					errors[`field_${field.id}`] = `${field.label} harus diawali angka 0, hanya berisi angka, dan panjang 10-15 digit`;
				}
			}
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, { message: 'Mohon lengkapi semua field yang wajib diisi', errors });
		}

		try {
			let submission;
			let isRevision = false;

			if (existingSubmission) {
				// ── REVISI: update pengajuan yang sama, JANGAN buat entri baru ──
				isRevision = true;
				submission = await db.service_submissions.update({
					where: { id: existingSubmission.id },
					data: {
						applicant_name: applicantName ?? existingSubmission.applicant_name,
						applicant_email: applicantEmail ?? existingSubmission.applicant_email,
						// Kembali ke "baru" (Menunggu Review Admin), PIC di-reset menunggu verifikasi ulang
						status: 'baru',
						assigned_to: null,
						updated_at: new Date()
					}
				});

				// Hapus nilai lama agar diganti data revisi (file lama yang tidak diunggah ulang dipertahankan)
				await db.service_submission_values.deleteMany({
					where: { submission_id: existingSubmission.id }
				});
			} else {
				// ── PENGAJUAN BARU: create seperti sebelumnya ──
				const trackingCode = generateTrackingCode();

				// Set initial status to 'baru' for Admin verification. PIC assignment will be done after verification.
				submission = await db.service_submissions.create({
					data: {
						service_id: serviceId,
						agency_id: service.agency_id,
						applicant_name: applicantName,
						applicant_email: applicantEmail,
						status: 'baru',
						assigned_to: null,
						tracking_code: trackingCode,
						created_at: new Date(),
						updated_at: new Date()
					}
				});
			}

			// Save field values
			for (const field of service.service_form_fields) {
				const rawValue = formData.get(`field_${field.id}`);

				if (field.type === 'file' && rawValue instanceof File && rawValue.size > 0) {
					// Handle file upload via storage abstraction (S3/MinIO or local volume)
					const trackingCode = existingSubmission
						? existingSubmission.tracking_code
						: submission.tracking_code;
					const safeFileName = `${field.name}_${Date.now()}_${rawValue.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
					const key = submissionKey(trackingCode, safeFileName);

					const arrayBuffer = await rawValue.arrayBuffer();
					await putFile(key, Buffer.from(arrayBuffer), rawValue.type || undefined);

					await db.service_submission_values.create({
						data: {
							submission_id: submission.id,
							field_id: field.id,
							file_path: toPublicUrl(key),
							created_at: new Date(),
							updated_at: new Date()
						}
					});
				} else if (field.type === 'file') {
					// Revisi: file tidak diunggah ulang → pertahankan file lama
					const clearOldFile =
						existingSubmission && formData.get(`field_${field.id}_clear_file`) === '1';
					const oldFile =
						existingSubmission && !clearOldFile
							? (oldValues.get(field.id)?.file_path ?? null)
							: null;
					if (oldFile) {
						await db.service_submission_values.create({
							data: {
								submission_id: submission.id,
								field_id: field.id,
								file_path: oldFile,
								created_at: new Date(),
								updated_at: new Date()
							}
						});
					}
				} else if (rawValue && typeof rawValue === 'string' && rawValue.trim()) {
					await db.service_submission_values.create({
						data: {
							submission_id: submission.id,
							field_id: field.id,
							value: rawValue.trim(),
							created_at: new Date(),
							updated_at: new Date()
						}
					});
				}
			}

			const origin = new URL(request.url).origin;
			const policySource = isRevision ? 'revisi' : 'submit';
			const policyTo = isRevision ? 'baru' : 'baru';
			const policy = getNotificationPolicy(policySource, policyTo);
			const trackingCode = existingSubmission
				? existingSubmission.tracking_code
				: submission.tracking_code;

			if (policy) {
				// In-app: Pengaju + Admin
				await enqueueNotification({
					title: isRevision ? policy.inappTitle : policy.inappTitle,
					message: isRevision
						? `Revisi pengajuan Anda untuk layanan "${service.name}" telah dikirim ulang (${trackingCode}).`
						: `Pengajuan Anda untuk layanan "${service.name}" telah diterima (${trackingCode}).`,
					adminMessage: isRevision
						? `Pengaju mengirim ulang revisi untuk layanan "${service.name}" (${trackingCode}).`
						: `Ada pengajuan baru untuk layanan "${service.name}" dari ${applicantName || 'Anonim'} (${trackingCode}).`,
					type: policy.inappType,
					link: `/admin/pengajuan/${submission.id}`,
					recipients: 'both'
				});

				// Email real-time: Pengaju (E1a / revisi tidak mengirim ke pengaju lagi)
				if (policy.email.includes('pengaju') && applicantEmail) {
					await enqueueEventEmail({
						submissionId: submission.id,
						eventType: policy.eventKey,
						recipientRole: 'pengaju',
						recipientEmail: applicantEmail,
						mailOptions: {
							to: applicantEmail,
							subject: `Permohonan Diterima — ${service.name} (${trackingCode})`,
							html: submissionReceivedTemplate({
								name: applicantName || 'Pemohon',
								serviceName: service.name,
								submissionId: trackingCode,
								trackingUrl: `${origin}/?code=${trackingCode}`
							})
						}
					});
				}

				// Email real-time: Admin (E1b / E9 revisi) — kirim ke semua admin
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
						await enqueueEventEmail({
							submissionId: submission.id,
							eventType: policy.eventKey,
							recipientRole: 'admin',
							recipientEmail: admin.email,
							mailOptions: {
								to: admin.email,
								subject: isRevision
									? `[Revisi] Pengajuan Dikirim Ulang — ${service.name} (${trackingCode})`
									: `[Verifikasi] Pengajuan Baru — ${service.name} oleh ${applicantName || 'Pemohon'} (${trackingCode})`,
								html: adminVerificationTemplate({
									serviceName: service.name,
									applicantName,
									trackingCode,
									adminUrl: `${origin}/admin/pengajuan/${submission.id}`
								})
							}
						});
					}
				}
			}

			// Redirect ke halaman sukses dengan tracking code yang sama (revisi) atau baru
			throw redirect(303, `/form/${params.id}/success?code=${trackingCode}&revision=${isRevision ? '1' : '0'}`);
		} catch (err) {
			// Re-throw redirects
			if (
				err &&
				typeof err === 'object' &&
				'status' in err &&
				(err as { status?: number }).status === 303
			) {
				throw err;
			}
			console.error('Submission error:', err);
			return fail(500, { message: 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.' });
		}
	}
};