import { db } from '$lib/server/db';
import { NotificationService } from '$lib/server/notifications';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const load: PageServerLoad = async ({ params }) => {
    const { code } = params;

    const submission = await db.service_submissions.findUnique({
        where: { tracking_code: code },
        include: {
            services: {
                include: {
                    service_form_fields: {
                        orderBy: { order: 'asc' }
                    }
                }
            },
            service_submission_values: true,
            submission_notes: {
                orderBy: { created_at: 'desc' },
                take: 1
            }
        }
    });

    if (!submission) {
        throw error(404, 'Data pengajuan tidak ditemukan');
    }

    if (submission.status !== 'revisi') {
        throw error(403, 'Akses ditolak. Pengajuan tidak dalam status revisi.');
    }

    // Map current values to field IDs for easy lookup
    const currentValues = submission.service_submission_values.reduce((acc: any, val) => {
        acc[val.field_id.toString()] = {
            value: val.value,
            file_path: val.file_path
        };
        return acc;
    }, {});

    // Serialize BigInt and Date values
    const serialized = JSON.parse(
        JSON.stringify({
            submission: {
                id: submission.id,
                tracking_code: submission.tracking_code,
                status: submission.status,
                service_id: submission.service_id,
                note: submission.submission_notes[0]?.note || ''
            },
            service: submission.services,
            currentValues
        }, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    );

    return serialized;
};

export const actions: Actions = {
    submit: async ({ request, params }) => {
        const formData = await request.formData();
        const { code } = params;

        const submission = await db.service_submissions.findUnique({
            where: { tracking_code: code },
            include: {
                services: {
                    include: {
                        service_form_fields: true
                    }
                },
                service_submission_values: true
            }
        });

        if (!submission || submission.status !== 'revisi') {
            return fail(403, { message: 'Akses ditolak atau status pengajuan sudah berubah' });
        }

        const service = submission.services;
        const errors: Record<string, string> = {};

        // Validation loop
        for (const field of service.service_form_fields) {
            const value = formData.get(`field_${field.id}`);
            const stringValue = typeof value === 'string' ? value.trim() : '';
            const currentValue = submission.service_submission_values.find(v => v.field_id === field.id);

            if (field.is_required) {
                if (field.type === 'file') {
                    const hasExistingFile = currentValue && currentValue.file_path;
                    const newFile = value as File | null;
                    if (!hasExistingFile && (!newFile || newFile.size === 0)) {
                        errors[`field_${field.id}`] = `${field.label} wajib diunggah`;
                    }
                } else if (!stringValue) {
                    errors[`field_${field.id}`] = `${field.label} wajib diisi`;
                }
            }

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
            // Update submission status back to 'baru'
            await db.service_submissions.update({
                where: { id: submission.id },
                data: {
                    status: 'baru',
                    updated_at: new Date()
                }
            });

            // Update field values
            for (const field of service.service_form_fields) {
                const rawValue = formData.get(`field_${field.id}`);
                const currentValue = submission.service_submission_values.find(v => v.field_id === field.id);

                if (field.type === 'file') {
                    if (rawValue instanceof File && rawValue.size > 0) {
                        const uploadDir = join(process.cwd(), 'static', 'uploads', code);
                        await mkdir(uploadDir, { recursive: true });

                        const safeFileName = `${field.name}_rev_${Date.now()}_${rawValue.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                        const filePath = join(uploadDir, safeFileName);
                        const arrayBuffer = await rawValue.arrayBuffer();
                        await writeFile(filePath, Buffer.from(arrayBuffer));

                        const newPath = `/uploads/${code}/${safeFileName}`;
                        if (currentValue) {
                            await db.service_submission_values.update({ where: { id: currentValue.id }, data: { file_path: newPath, updated_at: new Date() } });
                        } else {
                            await db.service_submission_values.create({ data: { submission_id: submission.id, field_id: field.id, file_path: newPath } });
                        }
                    }
                } else if (typeof rawValue === 'string' && rawValue.trim()) {
                    if (currentValue) {
                        await db.service_submission_values.update({ where: { id: currentValue.id }, data: { value: rawValue.trim(), updated_at: new Date() } });
                    } else {
                        await db.service_submission_values.create({ data: { submission_id: submission.id, field_id: field.id, value: rawValue.trim() } });
                    }
                }
            }

            // Log the update
            await db.submission_notes.create({
                data: {
                    submission_id: submission.id,
                    user_id: null, 
                    status_from: 'revisi',
                    status_to: 'baru',
                    note: 'Pemohon telah memperbarui data pengajuan (Revisi Selesai).',
                    created_at: new Date(),
                    updated_at: new Date()
                } as any
            });

            await NotificationService.send({
                title: 'Revisi Selesai',
                message: `Pemohon telah mengirimkan revisi untuk pengajuan "${service.name}" (${code}).`,
                type: 'success',
                link: `/admin/pengajuan/${submission.id}`
            });

            throw redirect(303, `/form/${service.id}/success?code=${code}`);
        } catch (err) {
            if (err && typeof err === 'object' && 'status' in err) throw err;
            console.error('Revision submission error:', err);
            return fail(500, { message: 'Terjadi kesalahan saat memproses revisi.' });
        }
    }
};
