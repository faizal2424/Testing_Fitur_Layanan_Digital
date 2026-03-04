import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, locals }) => {
	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const search = url.searchParams.get('cari') || '';
	const dateFrom = url.searchParams.get('dari') || '';
	const dateTo = url.searchParams.get('sampai') || '';
	const page = parseInt(url.searchParams.get('halaman') || '1');
	const perPage = 15;

	const where: any = {};
	const user = (locals as any).user;

	if (user?.role === 'pic') {
		where.assigned_to = BigInt(user.id);
	}

	if (serviceFilter) where.service_id = BigInt(serviceFilter);
	if (statusFilter) where.status = statusFilter;

	if (search) {
		where.OR = [
			{ applicant_name: { contains: search } },
			{ applicant_email: { contains: search } },
			{ tracking_code: { contains: search } }
		];
	}

	if (dateFrom || dateTo) {
		where.created_at = {};
		if (dateFrom) where.created_at.gte = new Date(dateFrom + 'T00:00:00');
		if (dateTo) where.created_at.lte = new Date(dateTo + 'T23:59:59');
	}

	const [submissions, total, allServices] = await Promise.all([
		db.service_submissions.findMany({
			where,
			include: {
				services: { select: { name: true } },
				users: { select: { name: true } }
			},
			orderBy: [
				{ is_priority: 'desc' },
				{ created_at: 'desc' }
			],
			skip: (page - 1) * perPage,
			take: perPage
		}),
		db.service_submissions.count({ where }),
		db.services.findMany({
			select: { id: true, name: true },
			orderBy: { order: 'asc' }
		})
	]);

	return {
		submissions: submissions.map((s) => ({
			id: s.id.toString(),
			applicant_name: s.applicant_name || '-',
			applicant_email: s.applicant_email || '-',
			status: s.status,
			tracking_code: s.tracking_code,
			is_priority: s.is_priority,
			service_name: s.services.name,
			assigned_to_name: s.users?.name || null,
			created_at: s.created_at?.toISOString() || null
		})),
		services: allServices.map((s) => ({ id: s.id.toString(), name: s.name })),
		pagination: { page, perPage, totalPages: Math.ceil(total / perPage), total },
		filters: { layanan: serviceFilter, status: statusFilter, cari: search, dari: dateFrom, sampai: dateTo }
	};
};
