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

export const load: PageServerLoad = async ({ params }) => {
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

    // Serialize BigInt values
    const serialized = JSON.parse(
        JSON.stringify(service, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    );

    return { service: serialized };
};

function generateTrackingCode(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `SVC-${date}-${random}`;
}

export const actions: Actions = {
    submit: async ({ request, params }) => {
        const formData = await request.formData();
        const serviceId = BigInt(params.id);

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
                // Check file uploads
                if (field.type === 'file') {
                    const file = value as File | null;
                    if (!file || file.size === 0) {
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
            const trackingCode = generateTrackingCode();

            // Set initial status to 'baru' for Admin verification. PIC assignment will be done after verification.
            const initialStatus = 'baru';
            const assignedPicId = null;

            // Create the submission
            const submission = await db.service_submissions.create({
                data: {
                    service_id: serviceId,
                    agency_id: service.agency_id,
                    applicant_name: applicantName,
                    applicant_email: applicantEmail,
                    status: initialStatus,
                    assigned_to: assignedPicId,
                    tracking_code: trackingCode,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });

            // Save field values
            for (const field of service.service_form_fields) {
                const rawValue = formData.get(`field_${field.id}`);

                if (field.type === 'file' && rawValue instanceof File && rawValue.size > 0) {
                    // Handle file upload via storage abstraction (S3/MinIO or local volume)
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

            // ── E1: Pengajuan baru (submit) — email real-time + in-app ──
            const policy = getNotificationPolicy('submit', 'baru');
            const origin = new URL(request.url).origin;

            if (policy) {
                // In-app: Pengaju + Admin
                await enqueueNotification({
                    title: policy.inappTitle,
                    message: `Pengajuan Anda untuk layanan "${service.name}" telah diterima (${trackingCode}).`,
                    adminMessage: `Ada pengajuan baru untuk layanan "${service.name}" dari ${applicantName || 'Anonim'} (${trackingCode}).`,
                    type: policy.inappType,
                    link: `/admin/pengajuan/${submission.id}`,
                    recipients: 'both'
                });

                // Email real-time: Pengaju (E1a)
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

                // Email real-time: Admin (E1b) — kirim ke semua admin
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
                                subject: `[Verifikasi] Pengajuan Baru — ${service.name} oleh ${applicantName || 'Pemohon'} (${trackingCode})`,
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

            // PIC assignment and notifications will be sent later after Admin verification.

            throw redirect(303, `/form/${params.id}/success?code=${trackingCode}`);
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
