<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/stores/toast';
	import { goto } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── State ──────────────────────────────────────────────────────────────────

	// Accordion open/closed state per agency id
	let openSections = $state<Record<string, boolean>>({});

	// Local services per agency (for drag reorder)
	let localAgencies = $state(
		data.agenciesWithServices.map((a) => ({ ...a, services: [...a.services] }))
	);

	// Reorder mode per agency
	let reorderModes = $state<Record<string, boolean>>({});
	let draggedIndex = $state<{ agencyId: string; index: number } | null>(null);

	// Create modal
	let showCreateModal = $state(false);
	let createAgencyId = $state(''); // which agency section triggered Tambah Layanan



	// Edit / delete modal
	let editingService = $state<any>(null);
	let deletingService = $state<any>(null);

	// Agency Modals
	let editingAgency = $state<any>(null);
	let creatingAgency = $state(false);
	let deletingAgency = $state<any>(null);

	// Icon picker
	const commonIcons = [
		'🏛️', '⚖️', '📜', '🗳️', '📄', '📝', '📁', '📋', '🛂', '🆔',
		'👤', '👥', '🏢', '🏠', '🏥', '🏫', '🛠️', '🏗️', '🚜', '⚙️',
		'💻', '🖥️', '⌨️', '🖱️', '💾', '🌐', '📱', '📡', '🔌', '🔋',
		'✉️', '📞', '📢', '🔔', '🔒', '🔑', '🛡️', '💰', '💳', '🚀'
	];
	let selectedCreateIcon = $state('📄');
	let selectedEditIcon = $state('');

	const opdList = [
		"Sekretariat Daerah","Sekretariat DPRD","Badan Perencanaan Pembangunan","Badan Kepegawaian dan Pengembangan Sumber Daya Manusia","Badan Penanggulangan Bencana Daerah","RSUD dr. Gunawan Mangunkusumo","RSUD dr. Gondo Suwarno","Badan Keuangan Daerah","Badan Kesatuan Bangsa dan Politik","Inspektorat Daerah","Satpol PP & Damkar","Dinas Kearsipan dan Perpustakaan","Dinas Lingkungan Hidup","Dinas Sosial","Dinas Tenaga Kerja","Dinas Pendidikan","Dinas Kesehatan","Dinas Pemberdayaan Perempuan","Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu","Dinas Pemberdayaan Masyarakat dan Desa","Dinas Pekerjaan Umum","Dinas Kependudukan dan Pencatatan Sipil","Dinas Pertanian","Dinas Perhubungan","Dinas Komunikasi dan Informatika","Dinas Pariwisata","Dinas Koperasi","Kecamatan Ambarawa","Kecamatan Bancak","Kecamatan Bandungan","Kecamatan Banyubiru","Kecamatan Bawen","Kecamatan Bergas","Kecamatan Bringin","Kecamatan Getasan","Kecamatan Jambu","Kecamatan Kaliwungu","Kecamatan Pabelan","Kecamatan Pringapus","Kecamatan Sumowono","Kecamatan Suruh","Kecamatan Susukan","Kecamatan Tengaran","Kecamatan Tuntang","Kecamatan Ungaran Barat","Kecamatan Ungaran Timur","Lainnya"
	];

	// ── Reactivity ────────────────────────────────────────────────────────────

	$effect(() => {
		localAgencies = data.agenciesWithServices.map((a) => ({ ...a, services: [...a.services] }));
		// Default all sections open
		for (const a of data.agenciesWithServices) {
			if (openSections[a.agency.id] === undefined) {
				openSections[a.agency.id] = true;
			}
		}
	});

	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Operasi berhasil');
			showCreateModal = false;
			editingService = null;
			deletingService = null;
			editingAgency = null;
			creatingAgency = false;
			deletingAgency = null;

			if (form?.action === 'create' && form?.newId) {
				goto(`/admin/layanan/${form.newId}/fields`);
			}
		} else if (form?.error) {
			toast.error(form.error);
		}
	});

	// ── Helpers ───────────────────────────────────────────────────────────────

	function toggleSection(agencyId: string) {
		openSections[agencyId] = !openSections[agencyId];
	}

	function openCreateFor(agencyId: string) {
		createAgencyId = agencyId;
		selectedCreateIcon = '📄';
		showCreateModal = true;
	}

	function openEdit(service: any) {
		editingService = { ...service };
		selectedEditIcon = service.icon || '📄';
	}

	function openDelete(service: any) {
		deletingService = service;
	}



	// ── Drag & Drop (per section) ─────────────────────────────────────────────

	function handleDragStart(agencyId: string, index: number) {
		draggedIndex = { agencyId, index };
	}

	function handleDragOver(e: DragEvent, agencyId: string, index: number) {
		e.preventDefault();
		if (!draggedIndex || draggedIndex.agencyId !== agencyId || draggedIndex.index === index) return;
		const agency = localAgencies.find((a) => a.agency.id === agencyId);
		if (!agency) return;
		const items = [...agency.services];
		const [dragged] = items.splice(draggedIndex.index, 1);
		items.splice(index, 0, dragged);
		localAgencies = localAgencies.map((a) =>
			a.agency.id === agencyId ? { ...a, services: items } : a
		);
		draggedIndex = { agencyId, index };
	}

	function handleDragEnd() {
		draggedIndex = null;
	}

	function getServicesForAgency(agencyId: string) {
		return localAgencies.find((a) => a.agency.id === agencyId)?.services ?? [];
	}

	function totalServices() {
		return localAgencies.reduce((n, a) => n + a.services.length, 0);
	}
</script>

<svelte:head>
	<title>Layanan — Layanan Digital</title>
</svelte:head>

<div class="page">
	<!-- ── Page Header ───────────────────────────────────────────────────────── -->
	<div class="page-header">
		<div>
			<h2 class="page-title">Kelola Layanan</h2>
			<p class="page-desc">
				{totalServices()} layanan tersebar di {localAgencies.length} instansi
			</p>
		</div>
		{#if data.isSuper}
			<button class="btn btn-primary" onclick={() => (creatingAgency = true)}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
				Tambah Instansi
			</button>
		{/if}
	</div>

	<!-- ── Empty state (no agencies at all) ──────────────────────────────────── -->
	{#if localAgencies.length === 0}
		<div class="empty-global">
			<div class="empty-icon">🏛️</div>
			<h3>Belum ada instansi</h3>
			{#if data.isSuper}
				<p>Klik <strong>"Tambah Instansi"</strong> di atas untuk mulai menambahkan layanan.</p>
			{:else}
				<p>Hubungi superadmin untuk mengonfigurasi instansi Anda.</p>
			{/if}
		</div>
	{/if}

	<!-- ── Accordion sections per agency ─────────────────────────────────────── -->
	<div class="accordion-list">
		{#each localAgencies as agencyGroup (agencyGroup.agency.id)}
			{@const agencyId = agencyGroup.agency.id}
			{@const isOpen = openSections[agencyId] !== false}
			{@const isReordering = reorderModes[agencyId] ?? false}
			{@const svcList = getServicesForAgency(agencyId)}

			<div class="agency-section" class:open={isOpen}>
				<!-- Section Header -->
				<div class="section-header" role="button" tabindex="0"
					onclick={() => toggleSection(agencyId)}
					onkeydown={(e) => e.key === 'Enter' && toggleSection(agencyId)}>

					<div class="section-header-left">
						<span class="agency-icon">🏛️</span>
						<div class="agency-title-group">
							<span class="agency-name">{agencyGroup.agency.name}</span>
							<span class="service-badge">{svcList.length} layanan</span>
						</div>
					</div>

					<div class="section-header-right" role="presentation" onclick={(e) => e.stopPropagation()}>
						{#if isReordering}
							<form method="POST" action="?/reorder" use:enhance={() => {
								return async ({ update }) => {
									reorderModes[agencyId] = false;
									await update();
								};
							}}>
								<input type="hidden" name="order" value={JSON.stringify(svcList.map((s, i) => ({ id: s.id, order: i })))} />
								<button type="submit" class="btn btn-sm btn-primary">
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
									Simpan Urutan
								</button>
							</form>
							<button class="btn btn-sm btn-secondary" onclick={() => { reorderModes[agencyId] = false; localAgencies = data.agenciesWithServices.map(a => ({ ...a, services: [...a.services] })); }}>Batal</button>
						{:else}
							{#if svcList.length > 1}
								<button class="btn btn-sm btn-ghost" onclick={() => { reorderModes[agencyId] = true; }}>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
									Atur Urutan
								</button>
							{/if}
							{#if data.isSuper}
								<button class="btn btn-sm btn-danger" onclick={() => { deletingAgency = agencyGroup.agency; }} aria-label="Hapus Instansi">
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
								</button>
							{/if}
							{#if data.isSuper || (data.user as any)?.agency_id == agencyId}
								<button class="btn btn-sm btn-secondary" onclick={() => { editingAgency = agencyGroup.agency; }}>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
									Edit Instansi
								</button>
							{/if}
							<button class="btn btn-sm btn-primary" onclick={() => openCreateFor(agencyId)}>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
								Tambah Layanan
							</button>
						{/if}
						<button class="chevron-btn" class:rotated={!isOpen} aria-label="Toggle section">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
						</button>
					</div>
				</div>

				<!-- Section Body -->
				{#if isOpen}
					<div class="section-body">
						{#if svcList.length === 0}
							<div class="section-empty">
								<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
								<p>Belum ada layanan. Klik <strong>"Tambah Layanan"</strong> di atas.</p>
							</div>
						{:else}
							<div class="services-list">
								{#each svcList as service, index (service.id)}
									<div
										class="service-card"
										class:dragging={isReordering && draggedIndex?.agencyId === agencyId && draggedIndex?.index === index}
										draggable={isReordering}
										ondragstart={() => handleDragStart(agencyId, index)}
										ondragover={(e) => handleDragOver(e, agencyId, index)}
										ondragend={handleDragEnd}
										role={isReordering ? 'listitem' : undefined}
									>
										{#if isReordering}
											<div class="drag-handle">
												<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
											</div>
										{/if}

										<div class="service-icon-wrap">
											{#if service.icon}
												<span class="service-emoji">{service.icon}</span>
											{:else}
												<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
											{/if}
										</div>

										<div class="service-info">
											<h3 class="service-name">{service.name}</h3>
											<div class="service-meta">
												<span class="meta-item">
													<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21"/></svg>
													{service.fieldCount} field
												</span>
												<span class="meta-item">
													<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
													{service.submissionCount} pengajuan
												</span>
											</div>
										</div>

										{#if !isReordering}
											<div class="service-actions">
												<a href="/admin/layanan/{service.id}/fields" class="btn btn-sm btn-secondary">Atur Field</a>
												<button class="btn btn-sm btn-secondary" onclick={() => openEdit(service)}>Edit</button>
												<button class="btn btn-sm btn-danger" onclick={() => openDelete(service)}>Hapus</button>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<!-- ── Modal: Tambah Instansi Baru ────────────────────────────────────────── -->
{#if creatingAgency}
	<div class="modal-overlay" onclick={() => { creatingAgency = false; }} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<h3>Tambah Instansi</h3>
				<button class="modal-close" onclick={() => { creatingAgency = false; }} aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/create_agency" use:enhance={() => {
				return async ({ update }) => { await update({ reset: false }); };
			}}>
				<div class="modal-body">
					<p class="modal-hint">Data ini akan digunakan sebagai kop surat otomatis pada bukti pengajuan layanan instansi.</p>
					<div class="form-group">
						<label for="c-agency-name">Nama Instansi *</label>
						<select id="c-agency-name" name="name" required class="form-control">
							<option value="">— Pilih OPD / Instansi —</option>
							{#each opdList as opd}
								<option value={opd}>{opd}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="c-agency-address">Alamat</label>
						<textarea id="c-agency-address" name="address" rows="2" placeholder="Contoh: Jl. Gatot Subroto No.104 A..."></textarea>
					</div>
					<div class="form-row" style="display: flex; gap: 1rem;">
						<div class="form-group" style="flex: 1;">
							<label for="c-agency-phone">No Telepon</label>
							<input type="text" id="c-agency-phone" name="phone" placeholder="(024) 76901553" />
						</div>
						<div class="form-group" style="flex: 1;">
							<label for="c-agency-email">Email</label>
							<input type="email" id="c-agency-email" name="email" placeholder="kominfo@semarangkab.go.id" />
						</div>
					</div>
					<div class="form-row" style="display: flex; gap: 1rem;">
						<div class="form-group" style="flex: 1;">
							<label for="c-agency-web">Website</label>
							<input type="text" id="c-agency-web" name="website" placeholder="diskominfo.semarangkab.go.id" />
						</div>
						<div class="form-group" style="flex: 1;">
							<label for="c-agency-postal">Kode Pos</label>
							<input type="text" id="c-agency-postal" name="postal_code" placeholder="50517" />
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => { creatingAgency = false; }}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan Instansi</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Modal: Edit Instansi ───────────────────────────────────────────────── -->
{#if editingAgency}
	<div class="modal-overlay" onclick={() => { editingAgency = null; }} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<h3>Edit Profil Instansi</h3>
				<button class="modal-close" onclick={() => { editingAgency = null; }} aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/update_agency" use:enhance={() => {
				return async ({ update }) => { await update({ reset: false }); };
			}}>
				<input type="hidden" name="id" value={editingAgency.id} />
				<div class="modal-body">
					<p class="modal-hint">Data ini digunakan sebagai kop surat otomatis pada bukti pengajuan layanan.</p>
					<div class="form-group">
						<label for="u-agency-name">Nama Instansi *</label>
						<select id="u-agency-name" name="name" required class="form-control" value={editingAgency.name}>
							<option value="">— Pilih OPD / Instansi —</option>
							{#each opdList as opd}
								<option value={opd}>{opd}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="u-agency-address">Alamat</label>
						<textarea id="u-agency-address" name="address" rows="2">{editingAgency.address || ''}</textarea>
					</div>
					<div class="form-row" style="display: flex; gap: 1rem;">
						<div class="form-group" style="flex: 1;">
							<label for="u-agency-phone">No Telepon</label>
							<input type="text" id="u-agency-phone" name="phone" value={editingAgency.phone || ''} />
						</div>
						<div class="form-group" style="flex: 1;">
							<label for="u-agency-email">Email</label>
							<input type="email" id="u-agency-email" name="email" value={editingAgency.email || ''} />
						</div>
					</div>
					<div class="form-row" style="display: flex; gap: 1rem;">
						<div class="form-group" style="flex: 1;">
							<label for="u-agency-web">Website</label>
							<input type="text" id="u-agency-web" name="website" value={editingAgency.website || ''} />
						</div>
						<div class="form-group" style="flex: 1;">
							<label for="u-agency-postal">Kode Pos</label>
							<input type="text" id="u-agency-postal" name="postal_code" value={editingAgency.postal_code || ''} />
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => { editingAgency = null; }}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan Profil</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Modal: Hapus Instansi ──────────────────────────────────────────────── -->
{#if deletingAgency}
	<div class="modal-overlay" onclick={() => { deletingAgency = null; }} role="presentation">
		<div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<h3>Hapus Instansi</h3>
				<button class="modal-close" onclick={() => { deletingAgency = null; }} aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/delete_agency" use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}>
				<input type="hidden" name="id" value={deletingAgency.id} />
				<div class="modal-body">
					<p class="confirm-text">
						Apakah Anda yakin ingin menghapus Instansi <strong>"{deletingAgency.name}"</strong>?
					</p>
					<div class="alert alert-error" style="margin-top: 0.75rem;">
						Tindakan ini tidak bisa dibatalkan. Pastikan instansi ini tidak memiliki layanan aktif atau pengguna yang terikat.
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => { deletingAgency = null; }}>Batal</button>
					<button type="submit" class="btn btn-danger">Hapus Instansi</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Modal: Tambah Layanan ──────────────────────────────────────────────── -->
{#if showCreateModal}
	<div class="modal-overlay" onclick={() => { showCreateModal = false; }} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<h3>Tambah Layanan Baru</h3>
				<button class="modal-close" onclick={() => { showCreateModal = false; }} aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/create" use:enhance={() => {
				return async ({ update }) => { await update({ reset: false }); };
			}}>
				<!-- Hidden: agency_id from the section that triggered this modal -->
				<input type="hidden" name="agency_id" value={createAgencyId} />

				<div class="modal-body">
					<!-- Agency info chip -->
					{#if createAgencyId}
						{@const agencyName = localAgencies.find(a => a.agency.id === createAgencyId)?.agency.name ?? ''}
						<div class="agency-chip">
							<span>🏛️</span>
							<span>{agencyName}</span>
						</div>
					{/if}

					<div class="form-group">
						<label for="create-name">Nama Layanan *</label>
						<input type="text" id="create-name" name="name" required placeholder="Contoh: Fasilitasi Zoom" />
					</div>
					<div class="form-group">
						<div class="icon-selector-premium">
							<div class="selection-preview">
								<div class="preview-box">
									<span class="preview-emoji">{selectedCreateIcon || '❓'}</span>
								</div>
								<div class="preview-info">
									<label for="create-icon">Ikon Terpilih</label>
									<input type="text" id="create-icon" name="icon" bind:value={selectedCreateIcon} placeholder="Pilih atau ketik..." class="manual-input-premium" maxlength="5" />
								</div>
							</div>
							<div class="icon-grid-scroll">
								<div class="icon-grid">
									{#each commonIcons as icon}
										<button type="button" class="icon-item-btn" class:active={selectedCreateIcon === icon} onclick={() => selectedCreateIcon = icon}>{icon}</button>
									{/each}
								</div>
							</div>
						</div>
					</div>
					<div class="form-group">
						<label for="create-requirements">Persyaratan</label>
						<textarea id="create-requirements" name="requirements" rows="4" placeholder="Tuliskan persyaratan layanan..."></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => { showCreateModal = false; }}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Modal: Edit Layanan ────────────────────────────────────────────────── -->
{#if editingService}
	<div class="modal-overlay" onclick={() => { editingService = null; }} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<h3>Edit Layanan</h3>
				<button class="modal-close" onclick={() => { editingService = null; }} aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/update" use:enhance={() => {
				return async ({ update }) => { await update({ reset: false }); };
			}}>
				<input type="hidden" name="id" value={editingService.id} />
				<div class="modal-body">
					{#if data.isSuper}
						<div class="form-group">
							<label for="edit-agency">Instansi / OPD</label>
							<select id="edit-agency" name="agency_id" class="form-control"
								value={data.allAgencies.find(a => a.id === editingService.agency_id)?.id || ''}>
								<option value="">Pilih Instansi...</option>
								{#each data.allAgencies as agency}
									<option value={agency.id}>{agency.name}</option>
								{/each}
							</select>
						</div>
					{/if}
					<div class="form-group">
						<label for="edit-name">Nama Layanan *</label>
						<input type="text" id="edit-name" name="name" required value={editingService.name} />
					</div>
					<div class="form-group">
						<div class="icon-selector-premium">
							<div class="selection-preview">
								<div class="preview-box">
									<span class="preview-emoji">{selectedEditIcon || '❓'}</span>
								</div>
								<div class="preview-info">
									<label for="edit-icon">Ikon Terpilih</label>
									<input type="text" id="edit-icon" name="icon" bind:value={selectedEditIcon} placeholder="Pilih atau ketik..." class="manual-input-premium" maxlength="5" />
								</div>
							</div>
							<div class="icon-grid-scroll">
								<div class="icon-grid">
									{#each commonIcons as icon}
										<button type="button" class="icon-item-btn" class:active={selectedEditIcon === icon} onclick={() => selectedEditIcon = icon}>{icon}</button>
									{/each}
								</div>
							</div>
						</div>
					</div>
					<div class="form-group">
						<label for="edit-requirements">Persyaratan</label>
						<textarea id="edit-requirements" name="requirements" rows="4">{editingService.requirements || ''}</textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => { editingService = null; }}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan Perubahan</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Modal: Hapus Layanan ───────────────────────────────────────────────── -->
{#if deletingService}
	<div class="modal-overlay" onclick={() => { deletingService = null; }} role="presentation">
		<div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<h3>Hapus Layanan</h3>
				<button class="modal-close" onclick={() => { deletingService = null; }} aria-label="Tutup">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/delete" use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}>
				<input type="hidden" name="id" value={deletingService.id} />
				<div class="modal-body">
					<p class="confirm-text">
						Apakah Anda yakin ingin menghapus layanan <strong>"{deletingService.name}"</strong>?
					</p>
					{#if deletingService.submissionCount > 0}
						<div class="alert alert-error" style="margin-top: 0.75rem;">
							Layanan ini memiliki {deletingService.submissionCount} pengajuan dan tidak bisa dihapus.
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => { deletingService = null; }}>Batal</button>
					<button type="submit" class="btn btn-danger" disabled={deletingService.submissionCount > 0}>Hapus</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* ── Accordion ──────────────────────────────────────────────────────────── */
	.accordion-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.agency-section {
		background: white;
		border-radius: 18px;
		border: 1px solid #f0f0f2;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
		overflow: hidden;
		transition: box-shadow 0.2s;
	}

	.agency-section:hover {
		box-shadow: 0 4px 16px rgba(0,0,0,0.08);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.1rem 1.5rem;
		cursor: pointer;
		user-select: none;
		background: #fafafa;
		border-bottom: 1px solid transparent;
		transition: background 0.15s;
		gap: 1rem;
	}

	.agency-section.open .section-header {
		border-bottom-color: #f3f4f6;
	}

	.section-header:hover {
		background: #f5f5f7;
	}

	.section-header-left {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
	}

	.agency-icon {
		font-size: 1.4rem;
		flex-shrink: 0;
	}

	.agency-title-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		flex-wrap: wrap;
	}

	.agency-name {
		font-size: 0.95rem;
		font-weight: 700;
		color: #111827;
	}

	.service-badge {
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.15rem 0.55rem;
		background: linear-gradient(135deg, #fdf2f8, #fce7f3);
		color: #9d174d;
		border-radius: 20px;
		border: 1px solid #fbcfe8;
		white-space: nowrap;
	}

	.section-header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.chevron-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: #9ca3af;
		display: flex;
		align-items: center;
		padding: 0.25rem;
		border-radius: 6px;
		transition: all 0.25s;
		transform-origin: center;
	}

	.chevron-btn.rotated {
		transform: rotate(180deg);
	}

	/* Section body */
	.section-body {
		padding: 1rem 1.5rem 1.25rem;
		animation: slideDown 0.2s ease-out;
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-6px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.section-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem;
		color: #9ca3af;
		text-align: center;
	}

	.section-empty p {
		font-size: 0.85rem;
		margin: 0;
	}

	/* ── Service cards ───────────────────────────────────────────────────────── */
	.services-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.service-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: #fafafa;
		border-radius: 12px;
		padding: 1rem 1.1rem;
		border: 1px solid #f3f4f6;
		transition: all 0.2s;
	}

	.service-card:hover {
		background: white;
		box-shadow: 0 3px 10px rgba(0,0,0,0.07);
		border-color: #e5e7eb;
	}

	.service-card.dragging {
		opacity: 0.45;
		border-color: #800020;
	}

	.drag-handle {
		cursor: grab;
		color: #9ca3af;
		flex-shrink: 0;
		padding: 0.2rem;
	}

	.drag-handle:active { cursor: grabbing; }

	.service-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 11px;
		background: linear-gradient(135deg, #fdf2f8, #fce7f3);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: #be185d;
	}

	.service-emoji { font-size: 1.4rem; }

	.service-info {
		flex: 1;
		min-width: 0;
	}

	.service-name {
		font-size: 0.92rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.2rem;
	}

	.service-meta {
		display: flex;
		gap: 0.8rem;
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.service-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	/* ── Empty global ────────────────────────────────────────────────────────── */
	.empty-global {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 4rem 2rem;
		text-align: center;
		color: #6b7280;
	}

	.empty-icon { font-size: 3rem; }
	.empty-global h3 { font-size: 1.1rem; font-weight: 700; color: #374151; margin: 0; }
	.empty-global p { font-size: 0.88rem; margin: 0; }

	/* ── Agency chip (in create modal) ──────────────────────────────────────── */
	.agency-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.85rem;
		background: linear-gradient(135deg, #fdf2f8, #fce7f3);
		border: 1px solid #fbcfe8;
		border-radius: 20px;
		font-size: 0.82rem;
		font-weight: 600;
		color: #9d174d;
	}

	/* ── Alerts ──────────────────────────────────────────────────────────────── */
	.alert {
		padding: 0.75rem 1rem;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.alert-error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	/* ── Modal ───────────────────────────────────────────────────────────────── */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 24px;
		width: 100%;
		max-width: 520px;
		box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
		animation: modalIn 0.2s ease-out;
		overflow: hidden;
	}

	.modal-sm { max-width: 420px; }

	@keyframes modalIn {
		from { opacity: 0; transform: scale(0.95) translateY(10px); }
		to   { opacity: 1; transform: scale(1) translateY(0); }
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #f3f4f6;
		background: #fafafa;
	}

	.modal-header h3 {
		font-size: 1.05rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
	}

	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		border: none;
		background: #f3f4f6;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s;
	}

	.modal-close:hover { background: #e5e7eb; color: #111827; }

	.modal-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.modal-hint {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.5;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-top: 1px solid #f3f4f6;
		background: #fafafa;
	}

	/* ── Form ────────────────────────────────────────────────────────────────── */
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.form-group label {
		font-size: 0.82rem;
		font-weight: 600;
		color: #374151;
	}

	.form-group input,
	.form-group textarea,
	.form-group select,
	.form-control {
		padding: 0.75rem 1rem;
		border: 1.5px solid #e5e7eb;
		border-radius: 12px;
		font-size: 0.88rem;
		color: #1f2937;
		background: #f9fafb;
		font-family: inherit;
		transition: all 0.2s;
		resize: vertical;
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: #800020;
		box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1);
		background: white;
	}

	.hint-text {
		font-size: 0.78rem;
		color: #9ca3af;
		margin: 0;
	}

	.confirm-text {
		font-size: 0.9rem;
		color: #374151;
		margin: 0;
		line-height: 1.5;
	}

	/* ── Icon Picker ─────────────────────────────────────────────────────────── */
	.icon-selector-premium {
		background: #f8fafc;
		border: 1.5px solid #e2e8f0;
		border-radius: 20px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.selection-preview {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: white;
		padding: 0.75rem;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
	}

	.preview-box {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #fdf2f8, #fce7f3);
		border-radius: 12px;
		border: 1.5px solid #fbcfe8;
		flex-shrink: 0;
	}

	.preview-emoji { font-size: 1.75rem; }

	.preview-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.preview-info label {
		font-size: 0.75rem;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.manual-input-premium {
		background: transparent !important;
		border-color: #cbd5e1 !important;
		padding: 0.4rem 0.6rem !important;
		font-size: 1rem !important;
		font-weight: 500 !important;
		width: 100% !important;
	}

	.manual-input-premium:focus {
		border-color: #800020 !important;
		box-shadow: none !important;
	}

	.icon-grid-scroll {
		max-height: 160px;
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.icon-grid-scroll::-webkit-scrollbar { width: 5px; }
	.icon-grid-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
	.icon-grid-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 0.4rem;
	}

	.icon-item-btn {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.15rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}

	.icon-item-btn:hover {
		border-color: #800020;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(128, 0, 32, 0.1);
	}

	.icon-item-btn.active {
		background: #800020;
		border-color: #800020;
		color: white;
		transform: scale(1.1);
		z-index: 1;
	}

	/* ── Responsive ──────────────────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.section-header { flex-wrap: wrap; gap: 0.75rem; }
		.section-header-right { width: 100%; justify-content: flex-end; }
		.service-card { flex-wrap: wrap; }
		.service-actions { width: 100%; justify-content: flex-end; }
		.icon-grid { grid-template-columns: repeat(6, 1fr); }
	}

	@media (max-width: 480px) {
		.icon-grid { grid-template-columns: repeat(5, 1fr); }
	}
</style>
