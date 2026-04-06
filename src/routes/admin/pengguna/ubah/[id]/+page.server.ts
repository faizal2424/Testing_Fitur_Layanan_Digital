import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { requireAdmin, hashPassword } from '$lib/server/auth';
import { error, redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const id = event.params.id;

	const userRole = event.locals.user?.role;
	const [user, roles, agenciesList] = await Promise.all([
		db.users.findUnique({
			where: { id: BigInt(id) },
			include: {
				user_roles: {
					include: {
						roles: true
					}
				}
			}
		}),
		db.roles.findMany({
			where: userRole === 'superadmin' ? {} : {
				NOT: {
					name: {
						contains: 'superadmin'
					}
				}
			},
			orderBy: { name: 'asc' }
		}),
		userRole === 'superadmin' ? db.agencies.findMany({ orderBy: { name: 'asc' } }) : []
	]);

	if (!user) {
		throw error(404, 'Pengguna tidak ditemukan');
	}

	return {
		editUser: {
			id: user.id.toString(),
			name: user.name,
			username: user.username || '',
			email: user.email,
			phone: user.phone || '',
			roleIds: user.user_roles.map((ur) => ur.role_id.toString()),
			agency_id: user.agency_id ? user.agency_id.toString() : ''
		},
		roles: roles.map((r) => ({ id: r.id.toString(), name: r.name })),
		agencies: agenciesList.map(a => ({ id: a.id.toString(), name: a.name })),
		isSuper: userRole === 'superadmin'
	};
};

export const actions: Actions = {
	ubah: async (event) => {
		requireAdmin(event);
		const id = event.params.id;
		const formData = await event.request.formData();
		
		const name = formData.get('name')?.toString();
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();
		const phone = formData.get('phone')?.toString();
		const password = formData.get('password')?.toString();
		const password_confirmation = formData.get('password_confirmation')?.toString();
		const selectedRoleIds = formData.getAll('roles').map(id => BigInt(id.toString()));
		const currentUser = event.locals.user as any;
		const userRole = currentUser?.role;

		let agency_id: bigint | null | undefined = undefined;
		if (userRole === 'superadmin') {
			const formAgencyId = formData.get('agency_id')?.toString();
			if (formAgencyId) {
				agency_id = BigInt(formAgencyId);
			} else {
				agency_id = null; // Maybe they cleared it, wait, required in Svelte if superadmin.
			}
		}

		// Security check: Only superadmin can assign superadmin role
		if (userRole !== 'superadmin') {
			const targetRoles = await db.roles.findMany({
				where: {
					id: { in: selectedRoleIds }
				}
			});

			const hasSuperAdmin = targetRoles.some(r => r.name.toLowerCase().includes('superadmin'));
			if (hasSuperAdmin) {
				return fail(403, { message: 'Hanya Super Admin yang dapat memberikan peran Super Admin', success: false });
			}
		}

		// Basic validation
		if (!name || !username || !email || selectedRoleIds.length === 0) {
			return fail(400, { message: 'Nama, Username, Email, dan Peran wajib diisi', success: false });
		}

		if (password && password !== password_confirmation) {
			return fail(400, { message: 'Konfirmasi kata sandi tidak cocok', success: false });
		}

		if (password && password.length < 8) {
			return fail(400, { message: 'Kata sandi minimal 8 karakter', success: false });
		}

		// Phone validation
		if (phone && !/^0[0-9]{1,14}$/.test(phone)) {
			return fail(400, { message: 'Nomor telepon harus diawali angka 0 dan maksimal 15 angka', success: false });
		}

		try {
			// Check uniqueness
			const existingUser = await db.users.findFirst({
				where: {
					OR: [
						{ username },
						{ email }
					],
					NOT: {
						id: BigInt(id)
					}
				}
			});

			if (existingUser) {
				const field = existingUser.email === email ? 'Email' : 'Username';
				return fail(400, { message: `${field} sudah digunakan oleh pengguna lain`, success: false });
			}

			// Build update data
			const updateData: any = {
				name,
				username,
				email,
				phone,
				...(agency_id !== undefined && { agency_id })
			};

			if (password) {
				updateData.password = await hashPassword(password);
			}

			// Update user and sync roles
			await db.$transaction([
				// Update user details
				db.users.update({
					where: { id: BigInt(id) },
					data: updateData
				}),
				// Remove old roles
				db.user_roles.deleteMany({
					where: { user_id: BigInt(id) }
				}),
				// Add new roles
				db.user_roles.createMany({
					data: selectedRoleIds.map(roleId => ({
						user_id: BigInt(id),
						role_id: roleId
					}))
				})
			]);

			return { success: true, message: 'Data pengguna berhasil diperbarui' };
		} catch (e) {
			console.error('Error updating user:', e);
			return fail(500, { message: 'Gagal memperbarui data pengguna', success: false });
		}
	}
};
