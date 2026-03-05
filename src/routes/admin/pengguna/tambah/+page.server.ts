import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { requireAdmin, hashPassword } from '$lib/server/auth';
import { error, redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);

	const roles = await db.roles.findMany({
		orderBy: { name: 'asc' }
	});

	return {
		roles: roles.map((r) => ({ id: r.id.toString(), name: r.name }))
	};
};

export const actions: Actions = {
	tambah: async (event) => {
		requireAdmin(event);
		const formData = await event.request.formData();
		
		const name = formData.get('name')?.toString();
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();
		const phone = formData.get('phone')?.toString();
		const password = formData.get('password')?.toString();
		const password_confirmation = formData.get('password_confirmation')?.toString();
		const roles = formData.getAll('roles').map(id => BigInt(id.toString()));

		// Basic validation
		if (!name || !username || !email || !password || roles.length === 0) {
			return fail(400, { message: 'Semua bidang wajib diisi (kecuali telepon)', success: false });
		}

		if (password !== password_confirmation) {
			return fail(400, { message: 'Konfirmasi kata sandi tidak cocok', success: false });
		}

		if (password.length < 8) {
			return fail(400, { message: 'Kata sandi minimal 8 karakter', success: false });
		}

		try {
			// Check uniqueness
			const existingUser = await db.users.findFirst({
				where: {
					OR: [
						{ username },
						{ email }
					]
				}
			});

			if (existingUser) {
				const field = existingUser.email === email ? 'Email' : 'Username';
				return fail(400, { message: `${field} sudah digunakan`, success: false });
			}

			// Hash password
			const hashedPassword = await hashPassword(password);

			// Create user and roles
			await db.users.create({
				data: {
					name,
					username,
					email,
					phone,
					password: hashedPassword,
					user_roles: {
						create: roles.map(roleId => ({
							role_id: roleId
						}))
					}
				}
			});

			return { success: true, message: 'Pengguna berhasil ditambahkan' };
		} catch (e) {
			console.error('Error creating user:', e);
			return fail(500, { message: 'Gagal menambahkan pengguna', success: false });
		}
	}
};
