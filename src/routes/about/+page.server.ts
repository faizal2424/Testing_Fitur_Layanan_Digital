
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const serviceCount = await db.services.count();
        return {
            serviceCount
        };
    } catch (error) {
        console.error('Error fetching service count:', error);
        return {
            serviceCount: 0
        };
    }
};
