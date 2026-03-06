import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
	const serviceId = BigInt(params.id);

	const service = await db.services.findUnique({
		where: { id: serviceId },
		include: {
			service_form_fields: {
				orderBy: { order: 'asc' }
			}
		}
	});

	if (!service) {
		return { service: null, fields: [] };
	}

	return {
		service: {
			id: service.id.toString(),
			name: service.name,
			icon: service.icon
		},
		fields: service.service_form_fields.map((f) => ({
			id: f.id.toString(),
			label: f.label,
			name: f.name,
			type: f.type,
			is_required: f.is_required,
			options: f.options,
			placeholder: f.placeholder,
			help_text: f.help_text,
			order: f.order,
			meta: f.meta
		}))
	};
};

export const actions: Actions = {
	// Create new field
	create: async ({ request, params }) => {
		const serviceId = BigInt(params.id);
		const formData = await request.formData();

		const label = formData.get('label')?.toString()?.trim();
		const name = formData.get('name')?.toString()?.trim();
		const type = formData.get('type')?.toString();
		const is_required = formData.get('is_required') === 'on';
		const placeholder = formData.get('placeholder')?.toString()?.trim() || null;
		const help_text = formData.get('help_text')?.toString()?.trim() || null;
		const options = formData.get('options')?.toString()?.trim() || null;
		const order = formData.get('order')?.toString() || '0';
		
		// Collect meta based on type
		let metaObj: any = {};
		if (type === 'file') {
			metaObj.mimes = formData.get('mimes')?.toString();
			metaObj.max_size = formData.get('max_size')?.toString() || '2048';
		} else if (type === 'date') {
			metaObj.date_mode = formData.get('date_mode')?.toString();
		}
		const meta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;

		if (!label || !name || !type) {
			return fail(400, { 
				error: 'Label, nama field, dan tipe wajib diisi.',
				values: { label, name, type, is_required, placeholder, help_text, options, order, metaObj }
			});
		}

		try {
			await db.service_form_fields.create({
				data: {
					service_id: serviceId,
					label,
					name,
					type,
					is_required,
					placeholder,
					help_text,
					options,
					meta,
					order: parseInt(order),
					created_at: new Date(),
					updated_at: new Date()
				}
			});
			return { success: true, message: 'Field berhasil ditambahkan.' };
		} catch (e: any) {
			if (e?.code === 'P2002') {
				return fail(400, { 
					error: `Nama field "${name}" sudah digunakan di layanan ini.`,
					values: { label, name, type, is_required, placeholder, help_text, options, order, metaObj }
				});
			}
			return fail(500, { 
				error: 'Terjadi kesalahan sistem.',
				values: { label, name, type, is_required, placeholder, help_text, options, order, metaObj }
			});
		}
	},

	// Update field
	update: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const label = formData.get('label')?.toString()?.trim();
		const name = formData.get('name')?.toString()?.trim();
		const type = formData.get('type')?.toString();
		const is_required = formData.get('is_required') === 'on';
		const placeholder = formData.get('placeholder')?.toString()?.trim() || null;
		const help_text = formData.get('help_text')?.toString()?.trim() || null;
		const options = formData.get('options')?.toString()?.trim() || null;
		const order = formData.get('order')?.toString() || '0';

		// Collect meta based on type
		let metaObj: any = {};
		if (type === 'file') {
			metaObj.mimes = formData.get('mimes')?.toString();
			metaObj.max_size = formData.get('max_size')?.toString() || '2048';
		} else if (type === 'date') {
			metaObj.date_mode = formData.get('date_mode')?.toString();
		}
		const meta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;

		if (!id || !label || !name || !type) {
			return fail(400, { 
				error: 'Data tidak lengkap.',
				values: { id, label, name, type, is_required, placeholder, help_text, options, order, metaObj }
			});
		}

		try {
			await db.service_form_fields.update({
				where: { id: BigInt(id) },
				data: {
					label,
					name,
					type,
					is_required,
					placeholder,
					help_text,
					options,
					meta,
					order: parseInt(order),
					updated_at: new Date()
				}
			});
			return { success: true, message: 'Field berhasil diperbarui.' };
		} catch (e: any) {
			if (e?.code === 'P2002') {
				return fail(400, { 
					error: `Nama field "${name}" sudah digunakan.`,
					values: { id, label, name, type, is_required, placeholder, help_text, options, order, metaObj }
				});
			}
			return fail(500, { 
				error: 'Terjadi kesalahan sistem.',
				values: { id, label, name, type, is_required, placeholder, help_text, options, order, metaObj }
			});
		}
	},

	// Delete field
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID tidak valid.' });
		}

		await db.service_form_fields.delete({
			where: { id: BigInt(id) }
		});

		return { success: true, message: 'Field berhasil dihapus.' };
	},

	// Reorder fields
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
					db.service_form_fields.update({
						where: { id: BigInt(item.id) },
						data: { order: item.order, updated_at: new Date() }
					})
				)
			);
			return { success: true, message: 'Urutan field berhasil diperbarui.' };
		} catch {
			return fail(400, { error: 'Gagal memperbarui urutan.' });
		}
	}
};
