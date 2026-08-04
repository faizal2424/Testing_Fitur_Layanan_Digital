import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildSubmissionViewFilter } from '$lib/server/auth';

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

	// Role-based scope: PIC sees assigned/team submissions, admin sees own agency's submissions
	const scopeFilter = buildSubmissionViewFilter(user);

	if (serviceFilter) where.service_id = BigInt(serviceFilter);
	if (statusFilter) where.status = statusFilter;

	if (q) {
		const searchObj = { contains: q };
		const searchOr = [
			{ applicant_name: searchObj },
			{ applicant_email: searchObj },
			{ tracking_code: searchObj }
		];
		if (scopeFilter.OR || scopeFilter.services) {
			// Combine role-scope with search (AND) so scope is never lost
			where.AND = [{ ...scopeFilter }, { OR: searchOr }];
		} else {
			where.OR = searchOr;
		}
	} else {
		Object.assign(where, scopeFilter);
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
