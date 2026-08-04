import { db } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getTrackingSubmission,
	toPublicTrackingResult,
	serializeForClient
} from '$lib/server/tracking';

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
            const pengajuan = await getTrackingSubmission(code);
            if (pengajuan) {
                trackingResult = serializeForClient(toPublicTrackingResult(pengajuan));
            }
        } catch (error) {
            console.error('Error loading tracking code from URL:', error);
        }
    }

    return {
        listLayanan: serializeForClient(listLayanan),
        allAgencies: serializeForClient(allAgencies),
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
            const pengajuan = await getTrackingSubmission(code);

            if (!pengajuan) {
                return fail(404, { message: 'Data tidak ditemukan. Pastikan kode benar.' });
            }

            // Return safe data (BigInt handled)
            return {
                success: true,
                result: serializeForClient(toPublicTrackingResult(pengajuan))
            };
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Terjadi kesalahan pada database' });
        }
    }
};