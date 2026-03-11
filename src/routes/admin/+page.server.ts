import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, parent }) => {
	const parentData = await parent();

	// Parse filter params
	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const dateFrom = url.searchParams.get('dari') || '';
	const dateTo = url.searchParams.get('sampai') || '';
	const searchKeyword = url.searchParams.get('q') || '';
	const page = parseInt(url.searchParams.get('halaman') || '1');
	const perPage = 10;

	// Build where clause for submissions
	const where: any = {};

	if (serviceFilter) {
		where.service_id = BigInt(serviceFilter);
	}

	if (statusFilter) {
		where.status = statusFilter;
	}

	if (dateFrom || dateTo) {
		where.created_at = {};
		if (dateFrom) {
			where.created_at.gte = new Date(dateFrom + 'T00:00:00');
		}
		if (dateTo) {
			where.created_at.lte = new Date(dateTo + 'T23:59:59');
		}
	}

	if (searchKeyword) {
		where.OR = [
			{ applicant_name: { contains: searchKeyword } },
			{ applicant_email: { contains: searchKeyword } },
			{ tracking_code: { contains: searchKeyword } }
		];
	}

	// === Statistics & Analytics ===
	const [
		totalServices, 
		totalSubmissions, 
		filteredCount, 
		todayCount, 
		statusCounts,
		trendData,
		popularityData
	] = await Promise.all([
		// Total layanan
		db.services.count(),

		// Total pengajuan (all time)
		db.service_submissions.count(),

		// Filtered count
		db.service_submissions.count({ where }),

		// Today's submissions
		db.service_submissions.count({
			where: {
				created_at: {
					gte: new Date(new Date().toISOString().split('T')[0] + 'T00:00:00'),
					lte: new Date(new Date().toISOString().split('T')[0] + 'T23:59:59')
				}
			}
		}),

		// Count per status
		db.service_submissions.groupBy({
			by: ['status'],
			_count: { id: true }
		}),

		// Trend: Last 30 days
		db.$queryRawUnsafe<any[]>(`
			SELECT DATE(created_at) as date, COUNT(*) as count 
			FROM service_submissions 
			WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
			GROUP BY DATE(created_at) 
			ORDER BY date ASC
		`),

		// Popularity: By Service
		db.$queryRawUnsafe<any[]>(`
			SELECT s.name, COUNT(*) as count 
			FROM service_submissions sub 
			JOIN services s ON sub.service_id = s.id 
			GROUP BY s.id 
			ORDER BY count DESC 
			LIMIT 5
		`)
	]);

	// === Submissions list with pagination ===
	const [submissions, allServices] = await Promise.all([
		db.service_submissions.findMany({
			where,
			include: {
				services: {
					select: { name: true }
				},
				users: {
					select: { name: true }
				}
			},
			orderBy: { created_at: 'desc' },
			skip: (page - 1) * perPage,
			take: perPage
		}),

		// All services for filter dropdown
		db.services.findMany({
			select: { id: true, name: true },
			orderBy: { order: 'asc' }
		})
	]);

	const totalPages = Math.ceil(filteredCount / perPage);

	// Serialize BigInt values
	const serializedSubmissions = submissions.map((s) => ({
		id: s.id.toString(),
		applicant_name: s.applicant_name || '-',
		applicant_email: s.applicant_email || '-',
		status: s.status,
		tracking_code: s.tracking_code,
		is_priority: s.is_priority,
		service_name: s.services.name,
		assigned_to_name: s.users?.name || null,
		created_at: s.created_at?.toISOString() || null,
		updated_at: s.updated_at?.toISOString() || null
	}));

	const serializedServices = allServices.map((s) => ({
		id: s.id.toString(),
		name: s.name
	}));

	// Build status counts map
	const statusMap: Record<string, number> = {};
	for (const sc of statusCounts) {
		statusMap[sc.status] = sc._count.id;
	}

	return {
		stats: {
			totalServices,
			totalSubmissions,
			filteredCount,
			todayCount,
			statusMap,
			trends: trendData.map(t => ({
				date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date,
				count: Number(t.count)
			})),
			popularity: popularityData.map(p => ({
				name: p.name,
				count: Number(p.count)
			}))
		},
		submissions: serializedSubmissions,
		services: serializedServices,
		pagination: {
			page,
			perPage,
			totalPages,
			total: filteredCount
		},
		filters: {
			layanan: serviceFilter,
			status: statusFilter,
			dari: dateFrom,
			sampai: dateTo,
			q: searchKeyword
		}
	};
};
