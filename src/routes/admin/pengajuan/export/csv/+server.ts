import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const search = url.searchParams.get('cari') || '';
	const dateFrom = url.searchParams.get('dari') || '';
	const dateTo = url.searchParams.get('sampai') || '';

	const where: any = {};
	const user = (locals as any).user;

    // PIC Access Control: only see assigned or team submissions
	if (user?.role === 'pic') {
		where.OR = [
			{ assigned_to: BigInt(user.id) },
			{ submission_team_members: { some: { user_id: BigInt(user.id) } } }
		];
	}

	if (serviceFilter) where.service_id = BigInt(serviceFilter);
	if (statusFilter) where.status = statusFilter;

	if (search) {
		const searchObj = { contains: search };
		if (where.OR) {
            // If already have OR (pic filter), we need to wrap it better but for simplicity and since 
            // the user is likely one or the other (admin vs pic), we can just replace or append
            // In a more complex scenario we'd use AND: [ {OR: picFilter}, {OR: searchFilter} ]
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
