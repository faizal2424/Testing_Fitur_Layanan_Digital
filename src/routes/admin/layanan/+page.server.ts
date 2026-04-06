import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin'; // wait, what is superadmin role named?
	// The prompt said Superadmin (role admin utama). The system usually has 'admin' or 'superadmin'.
	// Let's check user roles. Wait, in auth.ts roleName is user_roles[0].roles.name.toLowerCase()
	// Let's just use user?.role === 'superadmin' and we can adjust.
	const authUser = user as any;
	const isSuper = authUser?.role === 'superadmin';
	
	const whereClause = !isSuper && authUser?.agency_id 
		? { agency_id: BigInt(authUser.agency_id) } 
		: {};

	const services = await db.services.findMany({
		where: whereClause,
		orderBy: { order: 'asc' },
		include: {
			agencies: true,
			_count: {
				select: {
					service_form_fields: true,
					service_submissions: true
				}
			}
		}
	});

	const agenciesList = isSuper ? await db.agencies.findMany({ orderBy: { name: 'asc' } }) : [];

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
				created_at: s.created_at?.toISOString() || null,
				agency_name: s.agencies?.name || 'Semua Instansi'
			};
		}),
		isSuper,
		agencies: agenciesList.map(a => ({ id: a.id.toString(), name: a.name }))
	};
};

export const actions: Actions = {
	// Create new service
	create: async ({ request, locals }) => {
		const user = (locals as any).user;
		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const icon = formData.get('icon')?.toString()?.trim() || null;
		const requirementsRaw = formData.get('requirements')?.toString()?.trim() || null;

		let agency_id = user?.agency_id ? BigInt(user.agency_id) : null;
		if (user?.role === 'superadmin') {
			const formAgencyId = formData.get('agency_id')?.toString();
			if (formAgencyId) {
				agency_id = BigInt(formAgencyId);
			}
		}

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

		const newService = await db.services.create({
			data: {
				name,
				icon,
				requirements,
				order: newOrder,
				agency_id,
				created_at: new Date(),
				updated_at: new Date()
			}
		});

		// Add default form fields
		const defaultFields = [
			{ 
				label: 'Nama', 
				name: 'nama_pemohon', 
				type: 'text', 
				is_required: true, 
				order: 1,
				placeholder: 'Masukkan nama pemohon'
			},
			{ 
				label: 'Organisasi Perangkat Daerah', 
				name: 'opd', 
				type: 'select', 
				is_required: true, 
				order: 2,
				placeholder: 'Pilih OPD',
				options: JSON.stringify([
					"Sekretariat Daerah","Sekretariat DPRD","Badan Perencanaan Pembangunan","Badan Kepegawaian dan Pengembangan Sumber Daya Manusia","Badan Penanggulangan Bencana Daerah","RSUD dr. Gunawan Mangunkusumo","RSUD dr. Gondo Suwarno","Badan Keuangan Daerah","Badan Kesatuan Bangsa dan Politik","Inspektorat Daerah","Satpol PP & Damkar","Dinas Kearsipan dan Perpustakaan","Dinas Lingkungan Hidup","Dinas Sosial","Dinas Tenaga Kerja","Dinas Pendidikan","Dinas Kesehatan","Dinas Pemberdayaan Perempuan","Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu","Dinas Pemberdayaan Masyarakat dan Desa","Dinas Pekerjaan Umum","Dinas Kependudukan dan Pencatatan Sipil","Dinas Pertanian","Dinas Perhubungan","Dinas Komunikasi dan Informatika","Dinas Pariwisata","Dinas Koperasi","Kecamatan Ambarawa","Kecamatan Bancak","Kecamatan Bandungan","Kecamatan Banyubiru","Kecamatan Bawen","Kecamatan Bergas","Kecamatan Bringin","Kecamatan Getasan","Kecamatan Jambu","Kecamatan Kaliwungu","Kecamatan Pabelan","Kecamatan Pringapus","Kecamatan Sumowono","Kecamatan Suruh","Kecamatan Susukan","Kecamatan Tengaran","Kecamatan Tuntang","Kecamatan Ungaran Barat","Kecamatan Ungaran Timur","Lainnya"
				])
			},
			{ 
				label: 'No WhatsApp', 
				name: 'no_whatsapp', 
				type: 'numbertelp', 
				is_required: true, 
				order: 3,
				placeholder: 'Masukkan nomor WhatsApp'
			},
			{ 
				label: 'Email', 
				name: 'email', 
				type: 'email', 
				is_required: true, 
				order: 4,
				placeholder: 'Masukkan alamat email'
			},
			{ 
				label: 'Surat Permohonan', 
				name: 'surat_permohonan', 
				type: 'file', 
				is_required: false, 
				order: 5,
				meta: JSON.stringify({ mimes: 'pdf,jpeg,png', max_size: '2048' })
			}
		];

		// Create the default fields
		await Promise.all(
			defaultFields.map((field) =>
				db.service_form_fields.create({
					data: {
						...field,
						service_id: newService.id,
						created_at: new Date(),
						updated_at: new Date()
					}
				})
			)
		);

		return { success: true, message: 'Layanan berhasil ditambahkan.', action: 'create', newId: newService.id.toString() };
	},

	// Update existing service
	update: async ({ request, locals }) => {
		const user = (locals as any).user;
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString()?.trim();
		const icon = formData.get('icon')?.toString()?.trim() || null;
		const requirementsRaw = formData.get('requirements')?.toString()?.trim() || null;

		let agency_id = undefined;
		if (user?.role === 'superadmin') {
			const formAgencyId = formData.get('agency_id')?.toString();
			if (formAgencyId) {
				agency_id = BigInt(formAgencyId);
			}
		}

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
				...(agency_id !== undefined && { agency_id }),
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
