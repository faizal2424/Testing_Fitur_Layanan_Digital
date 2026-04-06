import { db } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
    const listLayanan = await db.services.findMany({
        orderBy: {
            order: 'asc'
        },
        include: {
            agencies: true
        }
    });

    return { 
        listLayanan: JSON.parse(JSON.stringify(listLayanan, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ))
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

            // Map status code to readable text if needed, or just use the status string
            const statusLabels: Record<string, string> = {
                'baru': 'Diterima',
                'revisi': 'Perlu Revisi',
                'ditugaskan': 'Verifikasi',
                'diproses_pic': 'Proses',
                'diselesaikan_pic': 'Validasi',
                'selesai': 'Selesai',
                'ditolak_pengajuan': 'Pengajuan Ditangguhkan'
            };

            const result = {
                ...pengajuan,
                code: pengajuan.tracking_code,
                status_txt: statusLabels[pengajuan.status] || pengajuan.status,
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