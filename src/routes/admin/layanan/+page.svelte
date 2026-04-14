<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/stores/toast';
	import { goto } from '$app/navigation';

	import AgencyCreateModal from '$lib/components/admin/modals/AgencyCreateModal.svelte';
	import AgencyEditModal from '$lib/components/admin/modals/AgencyEditModal.svelte';
	import AgencyDeleteModal from '$lib/components/admin/modals/AgencyDeleteModal.svelte';
	import ServiceCreateModal from '$lib/components/admin/modals/ServiceCreateModal.svelte';
	import ServiceEditModal from '$lib/components/admin/modals/ServiceEditModal.svelte';
	import ServiceDeleteModal from '$lib/components/admin/modals/ServiceDeleteModal.svelte';

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

	const commonIcons = [
		'🏛️', '⚖️', '📜', '🗳️', '📄', '📝', '📁', '📋', '🛂', '🆔',
		'👤', '👥', '🏢', '🏠', '🏥', '🏫', '🛠️', '🏗️', '🚜', '⚙️',
		'💻', '🖥️', '⌨️', '🖱️', '💾', '🌐', '📱', '📡', '🔌', '🔋',
		'✉️', '📞', '📢', '🔔', '🔒', '🔑', '🛡️', '💰', '💳', '🚀'
	];

	const opdList = [
		"Sekretariat Daerah","Sekretariat DPRD","Badan Perencanaan Pembangunan","Badan Kepegawaian dan Pengembangan Sumber Daya Manusia","Badan Penanggulangan Bencana Daerah","RSUD dr. Gunawan Mangunkusumo","RSUD dr. Gondo Suwarno","Badan Keuangan Daerah","Badan Kesatuan Bangsa dan Politik","Inspektorat Daerah","Satpol PP & Damkar","Dinas Kearsipan dan Perpustakaan","Dinas Lingkungan Hidup","Dinas Sosial","Dinas Tenaga Kerja","Dinas Pendidikan","Dinas Kesehatan","Dinas Pemberdayaan Perempuan","Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu","Dinas Pemberdayaan Masyarakat dan Desa","Dinas Pekerjaan Umum","Dinas Kependudukan dan Pencatatan Sipil","Dinas Pertanian","Dinas Perhubungan","Dinas Komunikasi dan Informatika","Dinas Pariwisata","Dinas Koperasi","Kecamatan Ambarawa","Kecamatan Bancak","Kecamatan Bandungan","Kecamatan Banyubiru","Kecamatan Bawen","Kecamatan Bergas","Kecamatan Bringin","Kecamatan Getasan","Kecamatan Jambu","Kecamatan Kaliwungu","Kecamatan Pabelan","Kecamatan Pringapus","Kecamatan Sumowono","Kecamatan Suruh","Kecamatan Susukan","Kecamatan Tengaran","Kecamatan Tuntang","Kecamatan Ungaran Barat","Kecamatan Ungaran Timur","Lainnya"
	];

	// ── Reactivity ────────────────────────────────────────────────────────────

	$effect(() => {
		localAgencies = data.agenciesWithServices.map((a) => ({ ...a, services: [...a.services] }));
		// Default all sections closed
		for (const a of data.agenciesWithServices) {
			if (openSections[a.agency.id] === undefined) {
				openSections[a.agency.id] = false;
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

	function openCreate(agency_id: string = '') {
		createAgencyId = agency_id;
		showCreateModal = true;
	}

	function openEdit(service: any) {
		editingService = { ...service };
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
							<button class="btn btn-sm btn-primary" onclick={() => openCreate(agencyId)}>
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

<!-- ── Modals ────────────────────────────────────────────────────────────── -->
{#if creatingAgency}
	<AgencyCreateModal
		{opdList}
		onClose={() => { creatingAgency = false; }}
	/>
{/if}

{#if editingAgency}
	<AgencyEditModal
		agency={editingAgency}
		{opdList}
		onClose={() => { editingAgency = null; }}
	/>
{/if}

{#if deletingAgency}
	<AgencyDeleteModal
		agency={deletingAgency}
		onClose={() => { deletingAgency = null; }}
	/>
{/if}

{#if showCreateModal}
	<ServiceCreateModal
		agencyId={createAgencyId}
		agencyName={localAgencies.find(a => a.agency.id === createAgencyId)?.agency.name ?? ''}
		{commonIcons}
		onClose={() => { showCreateModal = false; }}
	/>
{/if}

{#if editingService}
	<ServiceEditModal
		service={editingService}
		isSuper={data.isSuper}
		allAgencies={data.allAgencies}
		{commonIcons}
		onClose={() => { editingService = null; }}
	/>
{/if}

{#if deletingService}
	<ServiceDeleteModal
		service={deletingService}
		onClose={() => { deletingService = null; }}
	/>
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
