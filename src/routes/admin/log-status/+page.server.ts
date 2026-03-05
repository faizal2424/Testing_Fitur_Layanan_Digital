import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, locals }) => {
	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const search = url.searchParams.get('cari') || '';
	const dateFrom = url.searchParams.get('dari') || '';
	const dateTo = url.searchParams.get('sampai') || '';
	const page = parseInt(url.searchParams.get('halaman') || '1');
	const perPage = 20;

	const where: any = {
		user_id: locals.user?.id
	};

	// Filter by status_to
	if (statusFilter) where.status_to = statusFilter;

	// Filter by service (via submission)
	if (serviceFilter) {
		where.service_submissions = { service_id: BigInt(serviceFilter) };
	}

	// Search tracking code or note
	if (search) {
		where.AND = [
			{ user_id: locals.user?.id },
			{
				OR: [
					{ note: { contains: search } },
					{ service_submissions: { tracking_code: { contains: search } } }
				]
			}
		];
	}

	// Date range
	if (dateFrom || dateTo) {
		where.created_at = {};
		if (dateFrom) where.created_at.gte = new Date(dateFrom + 'T00:00:00');
		if (dateTo) where.created_at.lte = new Date(dateTo + 'T23:59:59');
	}

	const [logs, total, services] = await Promise.all([
		db.submission_notes.findMany({
			where,
			include: {
				users: { select: { name: true } },
				service_submissions: {
					select: {
						tracking_code: true,
						applicant_name: true,
						services: { select: { name: true } }
					}
				}
			},
			orderBy: { created_at: 'desc' },
			skip: (page - 1) * perPage,
			take: perPage
		}),
		db.submission_notes.count({ where }),
		db.services.findMany({
			select: { id: true, name: true },
			orderBy: { order: 'asc' }
		})
	]);

	return {
		logs: logs.map((l) => ({
			id: l.id.toString(),
			status_from: l.status_from,
			status_to: l.status_to,
			note: l.note,
			user_name: l.users?.name || 'Sistem',
			tracking_code: l.service_submissions.tracking_code,
			applicant_name: l.service_submissions.applicant_name || '-',
			service_name: l.service_submissions.services.name,
			submission_id: l.submission_id.toString(),
			created_at: l.created_at?.toISOString() || null
		})),
		services: services.map((s) => ({ id: s.id.toString(), name: s.name })),
		pagination: { page, perPage, totalPages: Math.ceil(total / perPage), total },
		filters: { layanan: serviceFilter, status: statusFilter, cari: search, dari: dateFrom, sampai: dateTo }
	};
};
