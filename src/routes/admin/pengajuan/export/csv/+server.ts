import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { url, locals } = event;
	const user = locals.user;

	// Authentication guard — this is an admin-area export endpoint
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const q = url.searchParams.get('q') || '';
	const dateFrom = url.searchParams.get('dari') || '';
	const dateTo = url.searchParams.get('sampai') || '';

	const where: any = {};

	if (user.role === 'pic') {
		// PIC Access Control: only see assigned or team submissions
		where.OR = [
			{ assigned_to: BigInt(user.id) },
			{ submission_team_members: { some: { user_id: BigInt(user.id) } } }
		];
	} else if (user.role === 'admin' && user.agency_id) {
		// Per-OPD ownership: admin only sees submissions from their own agency's services
		where.services = {
			agency_id: BigInt(user.agency_id)
		};
	}
	// superadmin: no filter — sees everything

	if (serviceFilter) where.service_id = BigInt(serviceFilter);
	if (statusFilter) where.status = statusFilter;

	if (q) {
		const searchObj = { contains: q };
		if (where.OR) {
			where.AND = [
				{ OR: where.OR },
				{ OR: [
					{ applicant_name: searchObj },
					{ applicant_email: searchObj },
					{ tracking_code: searchObj }
				]}
			];
			delete where.OR;
		} else {
			where.OR = [
				{ applicant_name: searchObj },
				{ applicant_email: searchObj },
				{ tracking_code: searchObj }
			];
		}
	}

	if (dateFrom || dateTo) {
		where.created_at = {};
		if (dateFrom) where.created_at.gte = new Date(dateFrom + 'T00:00:00');
		if (dateTo) where.created_at.lte = new Date(dateTo + 'T23:59:59');
	}

	const submissions = await db.service_submissions.findMany({
		where,
		include: {
			services: { select: { name: true } },
			users: { select: { name: true } }
		},
		orderBy: { created_at: 'desc' }
	});

    // Helper to format date
    const formatDate = (d: Date | null) => {
        if (!d) return '';
        return d.toISOString().split('T')[0];
    };

    // CSV Construction
    const headers = ['Tracking Code', 'Applicant Name', 'Applicant Email', 'Service', 'Status', 'PIC', 'Priority', 'Created At'];
    const rows = submissions.map(s => [
        s.tracking_code,
        s.applicant_name,
        s.applicant_email,
        s.services.name,
        s.status,
        s.users?.name || '-',
        s.is_priority ? 'Yes' : 'No',
        formatDate(s.created_at)
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

	return new Response(csvContent, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="submissions_export_${formatDate(new Date())}.csv"`
		}
	});
};
