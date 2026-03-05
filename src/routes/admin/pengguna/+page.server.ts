import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { requireAdmin } from '$lib/server/auth';
import { error, redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);

	const url = event.url;
	const search = url.searchParams.get('cari') || '';
	const roleFilter = url.searchParams.get('peran') || '';
	const page = parseInt(url.searchParams.get('halaman') || '1');
	const perPage = 10;

	// Build where clause
	const where: any = {};

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

	const [users, totalCount, allRoles] = await Promise.all([
		db.users.findMany({
			where,
			include: {
				user_roles: {
					include: {
						roles: true
					}
				}
			},
			orderBy: { name: 'asc' },
			skip: (page - 1) * perPage,
			take: perPage
		}),
		db.users.count({ where }),
		db.roles.findMany({
			orderBy: { name: 'asc' }
		})
	]);

	const totalPages = Math.ceil(totalCount / perPage);

	// Serialize for SvelteKit
	const serializedUsers = users.map((user) => ({
		id: user.id.toString(),
		name: user.name,
		username: user.username || '-',
		email: user.email,
		phone: user.phone || '-',
		roles: user.user_roles.map((ur) => ur.roles.name),
		created_at: user.created_at?.toISOString() || null
	}));

	return {
		users: serializedUsers,
		roles: allRoles.map((r) => ({ id: r.id.toString(), name: r.name })),
		pagination: {
			page,
			perPage,
			totalPages,
			total: totalCount
		},
		filters: {
			cari: search,
			peran: roleFilter
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
