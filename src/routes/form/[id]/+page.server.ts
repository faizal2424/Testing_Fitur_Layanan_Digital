import { db } from '$lib/server/db';
import { NotificationService } from '$lib/server/notifications';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

            // Create the submission
            const submission = await db.service_submissions.create({
                data: {
                    service_id: serviceId,
                    applicant_name: applicantName,
                    applicant_email: applicantEmail,
                    status: 'baru',
                    tracking_code: trackingCode,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });

            // Save field values
            for (const field of service.service_form_fields) {
                const rawValue = formData.get(`field_${field.id}`);

                if (field.type === 'file' && rawValue instanceof File && rawValue.size > 0) {
                    // Handle file upload
                    const uploadDir = join(process.cwd(), 'static', 'uploads', trackingCode);
                    await mkdir(uploadDir, { recursive: true });

                    const safeFileName = `${field.name}_${Date.now()}_${rawValue.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const filePath = join(uploadDir, safeFileName);

                    const arrayBuffer = await rawValue.arrayBuffer();
                    await writeFile(filePath, Buffer.from(arrayBuffer));

                    await db.service_submission_values.create({
                        data: {
                            submission_id: submission.id,
                            field_id: field.id,
                            file_path: `/uploads/${trackingCode}/${safeFileName}`,
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

            // Send notification
            await NotificationService.send({
                title: 'Pengajuan Baru',
                message: `Ada pengajuan baru untuk layanan "${service.name}" dari ${applicantName || 'Anonim'} (${trackingCode}).`,
                type: 'info',
                link: `/admin/pengajuan/${submission.id}`
            });

            throw redirect(303, `/form/${params.id}/success?code=${trackingCode}`);
        } catch (err) {
            // Re-throw redirects
            if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
                throw err;
            }
            console.error('Submission error:', err);
            return fail(500, { message: 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.' });
        }
    }
};
