import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { requireAdmin, checkOwnership } from '$lib/server/auth';
import { error, redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);

	const url = event.url;
	const search = url.searchParams.get('cari') || '';
	const roleFilter = url.searchParams.get('peran') || '';
	const page = parseInt(url.searchParams.get('halaman') || '1');
	const perPage = 10;

	// Sorting params
	const sortBy = url.searchParams.get('sort_by') || '';
	const sortDir = url.searchParams.get('sort_dir') || 'asc';

	// Build where clause
	const where: any = {};
	
	const currentUser = event.locals.user as any;
	if (currentUser?.role === 'admin' && currentUser?.agency_id) {
		where.agency_id = BigInt(currentUser.agency_id);
	}

	if (search) {
		where.OR = [
			{ name: { contains: search } },
			{ email: { contains: search } },
			{ username: { contains: search } }
		];
	}

	if (roleFilter) {
		where.user_roles = {
			some: {
				roles: {
					name: roleFilter
				}
			}
		};
	}

	// Dynamically build orderBy
	const orderBy: any[] = [];
	if (sortBy) {
		if (sortBy === 'name') {
			orderBy.push({ name: sortDir });
		} else if (sortBy === 'username') {
			orderBy.push({ username: sortDir });
		} else if (sortBy === 'email') {
			orderBy.push({ email: sortDir });
		} else if (sortBy === 'agency') {
			orderBy.push({ agencies: { name: sortDir } });
		}
	} else {
		// Default
		orderBy.push({ name: 'asc' });
	}

	const [users, totalCount, allRoles, agenciesList] = await Promise.all([
		db.users.findMany({
			where,
			include: {
				user_roles: {
					include: {
						roles: true
					}
				},
				agencies: true
			},
			orderBy,
			skip: (page - 1) * perPage,
			take: perPage
		}),
		db.users.count({ where }),
		db.roles.findMany({
			orderBy: { name: 'asc' }
		}),
		currentUser?.role === 'superadmin' ? db.agencies.findMany({ orderBy: { name: 'asc' } }) : []
	]);

	const totalPages = Math.ceil(totalCount / perPage);

	// Serialize for SvelteKit
	const serializedUsers = users.map((user) => ({
		id: user.id.toString(),
		name: user.name,
		username: user.username || '-',
		email: user.email,
		phone: user.phone || '-',
		agency_name: user.agencies?.name || 'Semua Instansi',
		roles: user.user_roles.map((ur) => ur.roles.name),
		created_at: user.created_at?.toISOString() || null
	}));

	return {
		users: serializedUsers,
		roles: allRoles.map((r) => ({ id: r.id.toString(), name: r.name })),
		isSuper: currentUser?.role === 'superadmin',
		agencies: agenciesList.map(a => ({ id: a.id.toString(), name: a.name })),
		pagination: {
			page,
			perPage,
			totalPages,
			total: totalCount
		},
		filters: {
			cari: search,
			peran: roleFilter,
			sort_by: sortBy,
			sort_dir: sortDir
		}
	};
};

export const actions: Actions = {
	hapus: async (event) => {
		requireAdmin(event);
		const formData = await event.request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { message: 'ID tidak valid' });

		// Prevent self-deletion
		if (id === event.locals.user?.id.toString()) {
			return fail(400, { message: 'Anda tidak dapat menghapus akun Anda sendiri' });
		}

		// Ownership check: admin (OPD) can only delete users in their own agency
		const targetUser = await db.users.findUnique({
			where: { id: BigInt(id) },
			select: { agency_id: true }
		});
		if (!targetUser) {
			return fail(404, { message: 'Pengguna tidak ditemukan' });
		}
		if (event.locals.user?.role === 'admin' && !checkOwnership(event, targetUser.agency_id)) {
			return fail(403, { message: 'Tidak diizinkan menghapus pengguna dari instansi lain.' });
		}

		try {
			await db.users.delete({
				where: { id: BigInt(id) }
			});

			return { success: true, message: 'Pengguna berhasil dihapus' };
		} catch (e) {
			console.error('Error deleting user:', e);
			return fail(500, { message: 'Gagal menghapus pengguna' });
		}
	}
};
