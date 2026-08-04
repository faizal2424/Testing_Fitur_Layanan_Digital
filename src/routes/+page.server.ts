import { db } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getPublicStatusLabel } from '$lib/constants/status';

export const load: PageServerLoad = async ({ url }) => {
    const listLayanan = await db.services.findMany({
        orderBy: {
            order: 'asc'
        },
        include: {
            agencies: true
        }
    });

    const allAgencies = await db.agencies.findMany({
        orderBy: { name: 'asc' }
    });

    const code = url.searchParams.get('code')?.toString().trim();
    let trackingResult = null;

    if (code) {
        try {
            const pengajuan = await db.service_submissions.findUnique({
                where: { tracking_code: code },
                include: {
                    services: true,
                    users: true, // fetches the assigned user (PIC)
                    submission_notes: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            if (pengajuan) {
                const result = {
                    ...pengajuan,
                    code: pengajuan.tracking_code,
                    status_txt: getPublicStatusLabel(pengajuan.status),
                    service_name: pengajuan.services.name,
                    pic_phone: pengajuan.users?.phone || 'Menunggu Penugasan'
                };

                trackingResult = JSON.parse(JSON.stringify(result, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ));
            }
        } catch (error) {
            console.error('Error loading tracking code from URL:', error);
        }
    }

    return { 
        listLayanan: JSON.parse(JSON.stringify(listLayanan, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )),
        allAgencies: JSON.parse(JSON.stringify(allAgencies, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )),
        trackingResult
    };
};

export const actions: Actions = {
    // Action untuk menangani form "Cek Status"
    checkStatus: async ({ request }) => {
        const data = await request.formData();
        const code = data.get('code')?.toString().trim();

        if (!code) {
            return fail(400, { message: 'Kode pengajuan tidak boleh kosong' });
        }

        try {
            const pengajuan = await db.service_submissions.findUnique({
                where: { tracking_code: code },
                include: {
                    services: true,
                    users: true, // fetches the assigned user (PIC)
                    submission_notes: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            if (!pengajuan) {
                return fail(404, { message: 'Data tidak ditemukan. Pastikan kode benar.' });
            }

            const result = {
                ...pengajuan,
                code: pengajuan.tracking_code,
                status_txt: getPublicStatusLabel(pengajuan.status),
                service_name: pengajuan.services.name,
                pic_phone: pengajuan.users?.phone || 'Menunggu Penugasan'
            };

            // Return safe data (BigInt handled)
            return {
                success: true,
                result: JSON.parse(JSON.stringify(result, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ))
            };
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Terjadi kesalahan pada database' });
        }
    }
};