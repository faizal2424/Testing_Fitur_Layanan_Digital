import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requireAdmin } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const parentData = await event.parent();
	const user = parentData.user;

	// Parse filter params
	const serviceFilter = event.url.searchParams.get('layanan') || '';
	const statusFilter = event.url.searchParams.get('status') || '';
	const dateFrom = event.url.searchParams.get('dari') || '';
	const dateTo = event.url.searchParams.get('sampai') || '';
	const searchKeyword = event.url.searchParams.get('q') || '';
	const page = parseInt(event.url.searchParams.get('halaman') || '1');
	const perPage = 10;

	// Build where clause for submissions
	const where: any = {};

	// Role-based scope filtering:
	// If the user is an admin (admin OPD), restrict to their agency's services.
	// If the user is a superadmin, show everything (global).
	if (user?.role === 'admin' && user?.agency_id) {
		where.services = { agency_id: BigInt(user.agency_id) };
	}

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

	// Prepare conditions for general/stat queries based on role
	const statsWhere: any = {};
	const servicesWhere: any = {};
	if (user?.role === 'admin' && user?.agency_id) {
		const agencyIdBigInt = BigInt(user.agency_id);
		statsWhere.services = { agency_id: agencyIdBigInt };
		servicesWhere.agency_id = agencyIdBigInt;
	}

	// Dynamic SQL clauses for queryRaw
	let trendSql = `
		SELECT DATE(sub.created_at) as date, COUNT(*) as count 
		FROM service_submissions sub 
		WHERE sub.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
		GROUP BY DATE(sub.created_at) 
		ORDER BY date ASC
	`;
	let popularitySql = `
		SELECT s.name, COUNT(*) as count 
		FROM service_submissions sub 
		JOIN services s ON sub.service_id = s.id 
		GROUP BY s.id 
		ORDER BY count DESC 
		LIMIT 5
	`;
	let topOpdSql = `
		SELECT 
			JSON_UNQUOTE(
				JSON_EXTRACT(
					f.options,
					CONCAT('$[', idx.n, '].label')
				)
			) AS name,
			COUNT(*) AS count
		FROM service_submission_values v
		JOIN service_form_fields f ON v.field_id = f.id
		JOIN (
			SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
			UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
			UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
			UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
			UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
			UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
			UNION SELECT 30 UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34
			UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39
			UNION SELECT 40 UNION SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44
			UNION SELECT 45 UNION SELECT 46
		) idx ON JSON_UNQUOTE(JSON_EXTRACT(f.options, CONCAT('$[', idx.n, '].value'))) = v.value
		WHERE f.name = 'opd'
		GROUP BY name
		ORDER BY count DESC
		LIMIT 5
	`;

	if (user?.role === 'admin' && user?.agency_id) {
		trendSql = `
			SELECT DATE(sub.created_at) as date, COUNT(*) as count 
			FROM service_submissions sub 
			JOIN services s ON sub.service_id = s.id
			WHERE sub.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
			  AND s.agency_id = ${user.agency_id}
			GROUP BY DATE(sub.created_at) 
			ORDER BY date ASC
		`;
		popularitySql = `
			SELECT s.name, COUNT(*) as count 
			FROM service_submissions sub 
			JOIN services s ON sub.service_id = s.id 
			WHERE s.agency_id = ${user.agency_id}
			GROUP BY s.id 
			ORDER BY count DESC 
			LIMIT 5
		`;
		topOpdSql = `
			SELECT 
				JSON_UNQUOTE(
					JSON_EXTRACT(
						f.options,
						CONCAT('$[', idx.n, '].label')
					)
				) AS name,
				COUNT(*) AS count
			FROM service_submission_values v
			JOIN service_form_fields f ON v.field_id = f.id
			JOIN service_submissions sub ON v.submission_id = sub.id
			JOIN services s ON sub.service_id = s.id
			JOIN (
				SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
				UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
				UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
				UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
				UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
				UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
				UNION SELECT 30 UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34
				UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39
				UNION SELECT 40 UNION SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44
				UNION SELECT 45 UNION SELECT 46
			) idx ON JSON_UNQUOTE(JSON_EXTRACT(f.options, CONCAT('$[', idx.n, '].value'))) = v.value
			WHERE f.name = 'opd'
			  AND s.agency_id = ${user.agency_id}
			GROUP BY name
			ORDER BY count DESC
			LIMIT 5
		`;
	}

	// === Statistics & Analytics ===
	const [
		totalServices, 
		totalSubmissions, 
		inProgressCount,
		filteredCount, 
		todayCount, 
		statusCounts,
		trendData,
		popularityData,
		topOpdData
	] = await Promise.all([
		// Total layanan
		db.services.count({ where: servicesWhere }),

		// Total pengajuan (scoped all time)
		db.service_submissions.count({ where: statsWhere }),

		// Pengajuan dalam proses
		db.service_submissions.count({
			where: {
				...statsWhere,
				status: {
					notIn: ['selesai', 'ditolak_pengajuan']
				}
			}
		}),

		// Filtered count
		db.service_submissions.count({ where }),

		// Today's submissions
		db.service_submissions.count({
			where: {
				...statsWhere,
				created_at: {
					gte: new Date(new Date().toISOString().split('T')[0] + 'T00:00:00'),
					lte: new Date(new Date().toISOString().split('T')[0] + 'T23:59:59')
				}
			}
		}),

		// Count per status
		db.service_submissions.groupBy({
			where: statsWhere,
			by: ['status'],
			_count: { id: true }
		}),

		// Trend: Last 30 days
		db.$queryRawUnsafe<any[]>(trendSql),

		// Popularity: By Service
		db.$queryRawUnsafe<any[]>(popularitySql),

		// Top OPD: By Agency
		db.$queryRawUnsafe<any[]>(topOpdSql)
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
			where: servicesWhere,
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
			inProgressCount,
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
			})),
			topOpd: topOpdData.map(o => ({
				name: o.name,
				count: Number(o.count)
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
