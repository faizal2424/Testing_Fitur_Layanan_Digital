import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const code = url.searchParams.get('code');

    if (!code) {
        throw error(400, 'Kode pengajuan tidak ditemukan');
    }

    // Fetch submission for display
    const submission = await db.service_submissions.findUnique({
        where: { tracking_code: code },
        include: {
            services: true
        }
    });

    if (!submission) {
        throw error(404, 'Pengajuan tidak ditemukan');
    }

    // Serialize BigInt
    const serialized = JSON.parse(
        JSON.stringify(submission, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    );

    return {
        submission: serialized,
        trackingCode: code
    };
};
