import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const authUser = (locals as any).user;
	const isSuper = authUser?.role === 'superadmin';

	const whereClause =
		!isSuper && authUser?.agency_id ? { agency_id: BigInt(authUser.agency_id) } : {};

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

	// Get all agencies for the "Tambah Instansi" dropdown (superadmin only)
	const allAgenciesRaw = isSuper ? await db.agencies.findMany({ orderBy: { name: 'asc' } }) : [];

	// Helper to format a service record
	function formatService(s: typeof services[0]) {
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
			agency_id: s.agency_id?.toString() || null,
			agency_name: s.agencies?.name || 'Semua Instansi'
		};
	}

	// Group services by agency
	const agencyMap = new Map<string, { agency: { id: string; name: string; address?: string|null; phone?: string|null; website?: string|null; email?: string|null; postal_code?: string|null }; services: ReturnType<typeof formatService>[] }>();

	// Add all agencies to map for superadmin so they can be viewed/edited even if empty
	if (isSuper) {
		for (const a of allAgenciesRaw) {
			agencyMap.set(a.id.toString(), {
				agency: {
					id: a.id.toString(),
					name: a.name,
					address: a.address,
					phone: a.phone,
					website: a.website,
					email: a.email,
					postal_code: a.postal_code
				},
				services: []
			});
		}
	}

	for (const s of services) {
		const agencyId = s.agency_id?.toString() ?? 'unknown';
		const agencyName = s.agencies?.name ?? 'Tanpa Instansi';
		if (!agencyMap.has(agencyId)) {
			agencyMap.set(agencyId, { 
				agency: { 
					id: agencyId, 
					name: agencyName,
					address: s.agencies?.address,
					phone: s.agencies?.phone,
					website: s.agencies?.website,
					email: s.agencies?.email,
					postal_code: s.agencies?.postal_code
				}, 
				services: [] 
			});
		}
		agencyMap.get(agencyId)!.services.push(formatService(s));
	}

	// For admin (non-super) with no services yet, still show their agency as an empty section
	if (!isSuper && authUser?.agency_id && agencyMap.size === 0) {
		const ownAgency = await db.agencies.findUnique({ where: { id: BigInt(authUser.agency_id) } });
		if (ownAgency) {
			agencyMap.set(ownAgency.id.toString(), {
				agency: { 
					id: ownAgency.id.toString(), 
					name: ownAgency.name,
					address: ownAgency.address,
					phone: ownAgency.phone,
					website: ownAgency.website,
					email: ownAgency.email,
					postal_code: ownAgency.postal_code
				},
				services: []
			});
		}
	}

	const agenciesWithServices = Array.from(agencyMap.values());

	// Agencies not yet visible (for "Tambah Instansi" dropdown — superadmin only)
	const visibleAgencyIds = new Set(agenciesWithServices.map((a) => a.agency.id));
	const allAgencies = allAgenciesRaw.map((a) => ({
		id: a.id.toString(),
		name: a.name,
		alreadyVisible: visibleAgencyIds.has(a.id.toString())
	}));

	return {
		agenciesWithServices,
		isSuper,
		allAgencies
	};
};

export const actions: Actions = {
	// Create new agency
	create_agency: async ({ request }) => {
		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString()?.trim();
			const address = formData.get('address')?.toString()?.trim() || null;
			const phone = formData.get('phone')?.toString()?.trim() || null;
			const website = formData.get('website')?.toString()?.trim() || null;
			const email = formData.get('email')?.toString()?.trim() || null;
			const postal_code = formData.get('postal_code')?.toString()?.trim() || null;

			if (!name) {
				return fail(400, { error: 'Nama instansi wajib diisi.' });
			}

			await db.agencies.create({
				data: {
					name,
					address,
					phone,
					website,
					email,
					postal_code,
					created_at: new Date(),
					updated_at: new Date()
				}
			});

			return { success: true, message: 'Instansi berhasil ditambahkan.' };
		} catch (e: any) {
			console.error('Error create_agency:', e);
			return fail(500, { error: 'Gagal membuat instansi: ' + (e.message || String(e)) });
		}
	},

	// Update agency
	update_agency: async ({ request }) => {
		try {
			const formData = await request.formData();
			const id = formData.get('id')?.toString();
			const name = formData.get('name')?.toString()?.trim();
			const address = formData.get('address')?.toString()?.trim() || null;
			const phone = formData.get('phone')?.toString()?.trim() || null;
			const website = formData.get('website')?.toString()?.trim() || null;
			const email = formData.get('email')?.toString()?.trim() || null;
			const postal_code = formData.get('postal_code')?.toString()?.trim() || null;

			if (!id || !name) {
				return fail(400, { error: 'Data instansi tidak lengkap.' });
			}

			await db.agencies.update({
				where: { id: BigInt(id) },
				data: {
					name,
					address,
					phone,
					website,
					email,
					postal_code,
					updated_at: new Date()
				}
			});

			return { success: true, message: 'Profil instansi berhasil diperbarui.' };
		} catch (e: any) {
			console.error('Error update_agency:', e);
			return fail(500, { error: 'Gagal memperbarui instansi: ' + (e.message || String(e)) });
		}
	},

	// Delete agency
	delete_agency: async ({ request }) => {
		try {
			const formData = await request.formData();
			const id = formData.get('id')?.toString();

			if (!id) {
				return fail(400, { error: 'ID instansi tidak valid.' });
			}

			// Prevent deletion if connected to services
			const servicesCount = await db.services.count({
				where: { agency_id: BigInt(id) }
			});
			if (servicesCount > 0) {
				return fail(400, { error: `Tidak bisa menghapus Instansi. Terdapat ${servicesCount} layanan aktif.` });
			}

			// Prevent deletion if connected to users
			const usersCount = await db.users.count({
				where: { agency_id: BigInt(id) }
			});
			if (usersCount > 0) {
				return fail(400, { error: `Tidak bisa menghapus Instansi. Terdapat ${usersCount} akun admin (OPD) yang terdaftar.` });
			}

			await db.agencies.delete({
				where: { id: BigInt(id) }
			});

			return { success: true, message: 'Instansi berhasil dihapus.' };
		} catch (e: any) {
			console.error('Error delete_agency:', e);
			return fail(500, { error: 'Gagal menghapus instansi: ' + (e.message || String(e)) });
		}
	},

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
