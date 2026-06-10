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

	// Sorting params
	const sortBy = url.searchParams.get('sort_by') || '';
	const sortDir = url.searchParams.get('sort_dir') || 'desc';

	const where: any = {};
	const user = (locals as any).user;

	if (user?.role === 'pic') {
		where.OR = [
			{ assigned_to: BigInt(user.id) },
			{ submission_team_members: { some: { user_id: BigInt(user.id) } } }
		];
	} else if (user?.role === 'admin' && user?.agency_id) {
		where.services = { agency_id: BigInt(user.agency_id) };
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

	// Dynamically build the order by clause
	const orderBy: any[] = [];
	if (sortBy) {
		if (sortBy === 'tracking_code') {
			orderBy.push({ tracking_code: sortDir });
		} else if (sortBy === 'applicant_name') {
			orderBy.push({ applicant_name: sortDir });
		} else if (sortBy === 'service_name') {
			orderBy.push({ services: { name: sortDir } });
		} else if (sortBy === 'status') {
			orderBy.push({ status: sortDir });
		} else if (sortBy === 'created_at') {
			orderBy.push({ created_at: sortDir });
		}
	} else {
		// Default sorting
		orderBy.push({ is_priority: 'desc' });
		orderBy.push({ created_at: 'desc' });
	}

	const [submissions, total, allServices] = await Promise.all([
		db.service_submissions.findMany({
			where,
			include: {
				services: { select: { name: true } },
				users: { select: { name: true } },
				submission_team_members: {
					select: { user_id: true }
				}
			},
			orderBy,
			skip: (page - 1) * perPage,
			take: perPage
		}),
		db.service_submissions.count({ where }),
		db.services.findMany({
			where: user?.role === 'admin' && user?.agency_id ? { agency_id: BigInt(user.agency_id) } : {},
			select: { id: true, name: true },
			orderBy: { order: 'asc' }
		})
	]);

	return {
		submissions: submissions.map((s) => {
			let userRoleInSubmission = null;
			if (user?.role === 'pic') {
				if (s.assigned_to === BigInt(user.id)) {
					userRoleInSubmission = 'PIC Utama';
				} else if (s.submission_team_members.some((tm) => tm.user_id === BigInt(user.id))) {
					userRoleInSubmission = 'Anggota Tim';
				}
			}

			return {
				id: s.id.toString(),
				applicant_name: s.applicant_name || '-',
				applicant_email: s.applicant_email || '-',
				status: s.status,
				tracking_code: s.tracking_code,
				is_priority: s.is_priority,
				service_name: s.services.name,
				assigned_to_name: s.users?.name || null,
				created_at: s.created_at?.toISOString() || null,
				userRoleInSubmission
			};
		}),
		services: allServices.map((s) => ({ id: s.id.toString(), name: s.name })),
		pagination: { page, perPage, totalPages: Math.ceil(total / perPage), total },
		filters: {
			layanan: serviceFilter,
			status: statusFilter,
			cari: search,
			dari: dateFrom,
			sampai: dateTo,
			sort_by: sortBy,
			sort_dir: sortDir
		}
	};
};
