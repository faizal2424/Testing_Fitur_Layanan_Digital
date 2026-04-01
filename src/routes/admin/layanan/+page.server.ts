import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const services = await db.services.findMany({
		orderBy: { order: 'asc' },
		include: {
			_count: {
				select: {
					service_form_fields: true,
					service_submissions: true
				}
			}
		}
	});

	return {
		services: services.map((s) => {
			let formattedRequirements = s.requirements || '';
			try {
				if (s.requirements) {
					const parsed = JSON.parse(s.requirements);
					if (Array.isArray(parsed)) {
						formattedRequirements = parsed.join('\n');
					}
				}
			} catch {
				// Keep as is
			}

			return {
				id: s.id.toString(),
				name: s.name,
				icon: s.icon,
				order: s.order,
				requirements: formattedRequirements,
				fieldCount: s._count.service_form_fields,
				submissionCount: s._count.service_submissions,
				created_at: s.created_at?.toISOString() || null
			};
		})
	};
};

export const actions: Actions = {
	// Create new service
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const icon = formData.get('icon')?.toString()?.trim() || null;
		const requirementsRaw = formData.get('requirements')?.toString()?.trim() || null;

		let requirements = null;
		if (requirementsRaw) {
			const array = requirementsRaw.split('\n').map((l) => l.trim()).filter((l) => l !== '');
			requirements = JSON.stringify(array);
		}

		if (!name) {
			return fail(400, { error: 'Nama layanan wajib diisi.', action: 'create' });
		}

		// Get max order
		const maxOrder = await db.services.aggregate({ _max: { order: true } });
		const newOrder = (maxOrder._max.order || 0) + 1;

		await db.services.create({
			data: {
				name,
				icon,
				requirements,
				order: newOrder,
				created_at: new Date(),
				updated_at: new Date()
			}
		});

		return { success: true, message: 'Layanan berhasil ditambahkan.' };
	},

	// Update existing service
	update: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString()?.trim();
		const icon = formData.get('icon')?.toString()?.trim() || null;
		const requirementsRaw = formData.get('requirements')?.toString()?.trim() || null;

		let requirements = null;
		if (requirementsRaw) {
			const array = requirementsRaw.split('\n').map((l) => l.trim()).filter((l) => l !== '');
			requirements = JSON.stringify(array);
		}

		if (!id || !name) {
			return fail(400, { error: 'Data tidak lengkap.', action: 'update' });
		}

		await db.services.update({
			where: { id: BigInt(id) },
			data: {
				name,
				icon,
				requirements,
				updated_at: new Date()
			}
		});

		return { success: true, message: 'Layanan berhasil diperbarui.' };
	},

	// Delete service
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID tidak valid.' });
		}

		// Check if service has submissions
		const submissionCount = await db.service_submissions.count({
			where: { service_id: BigInt(id) }
		});

		if (submissionCount > 0) {
			return fail(400, {
				error: `Layanan tidak bisa dihapus karena memiliki ${submissionCount} pengajuan.`
			});
		}

		await db.services.delete({
			where: { id: BigInt(id) }
		});

		return { success: true, message: 'Layanan berhasil dihapus.' };
	},

	// Update order (drag and drop)
	reorder: async ({ request }) => {
		const formData = await request.formData();
		const orderData = formData.get('order')?.toString();

		if (!orderData) {
			return fail(400, { error: 'Data urutan tidak valid.' });
		}

		try {
			const items: { id: string; order: number }[] = JSON.parse(orderData);

			await Promise.all(
				items.map((item) =>
					db.services.update({
						where: { id: BigInt(item.id) },
						data: { order: item.order, updated_at: new Date() }
					})
				)
			);

			return { success: true, message: 'Urutan layanan berhasil diperbarui.' };
		} catch {
			return fail(400, { error: 'Gagal memperbarui urutan.' });
		}
	}
};
