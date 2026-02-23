<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateModal = $state(false);
	let editingService = $state<any>(null);
	let deletingService = $state<any>(null);
	let draggedIndex = $state<number | null>(null);
	let reorderMode = $state(false);
	let localServices = $state([...data.services]);

	// Sync when data changes
	$effect(() => {
		localServices = [...data.services];
	});

	function openEdit(service: any) {
		editingService = { ...service };
	}

	function closeEdit() {
		editingService = null;
	}

	function openDelete(service: any) {
		deletingService = service;
	}

	function closeDelete() {
		deletingService = null;
	}

	// Drag and drop handlers
	function handleDragStart(index: number) {
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;

		const items = [...localServices];
		const [draggedItem] = items.splice(draggedIndex, 1);
		items.splice(index, 0, draggedItem);
		localServices = items;
		draggedIndex = index;
	}

	function handleDragEnd() {
		draggedIndex = null;
	}
</script>

<svelte:head>
	<title>Layanan — Layanan Digital</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<div class="page-header">
		<div>
			<h2 class="page-title">Kelola Layanan</h2>
			<p class="page-desc">Tambah, edit, dan atur urutan layanan digital</p>
		</div>
		<div class="header-actions">
			{#if reorderMode}
				<form method="POST" action="?/reorder" use:enhance={() => {
					return async ({ update }) => {
						reorderMode = false;
						await update();
					};
				}}>
					<input type="hidden" name="order" value={JSON.stringify(localServices.map((s, i) => ({ id: s.id, order: i })))} />
					<button type="submit" class="btn btn-primary">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						Simpan Urutan
					</button>
				</form>
				<button class="btn btn-outline" onclick={() => { reorderMode = false; localServices = [...data.services]; }}>Batal</button>
			{:else}
				<button class="btn btn-outline" onclick={() => { reorderMode = true; }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
					Atur Urutan
				</button>
				<button class="btn btn-primary" onclick={() => { showCreateModal = true; }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Tambah Layanan
				</button>
			{/if}
		</div>
	</div>

	<!-- Success/Error Message -->
	{#if form?.success}
		<div class="alert alert-success">{form.message}</div>
	{/if}
	{#if form?.error}
		<div class="alert alert-error">{form.error}</div>
	{/if}

	<!-- Services List -->
	<div class="services-grid">
		{#if localServices.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
				</svg>
				<p>Belum ada layanan. Tambahkan layanan pertama!</p>
			</div>
		{:else}
			{#each localServices as service, index}
				<div
					class="service-card"
					class:dragging={reorderMode && draggedIndex === index}
					draggable={reorderMode}
					ondragstart={() => handleDragStart(index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragend={handleDragEnd}
					role={reorderMode ? 'listitem' : undefined}
				>
					{#if reorderMode}
						<div class="drag-handle">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
								<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
								<circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
							</svg>
						</div>
					{/if}

					<div class="service-icon-wrap">
						{#if service.icon}
							<span class="service-emoji">{service.icon}</span>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
							</svg>
						{/if}
					</div>

					<div class="service-info">
						<h3 class="service-name">{service.name}</h3>
						<div class="service-meta">
							<span class="meta-item">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21"/></svg>
								{service.fieldCount} field
							</span>
							<span class="meta-item">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
								{service.submissionCount} pengajuan
							</span>
						</div>
					</div>

					{#if !reorderMode}
						<div class="service-actions">
							<a href="/admin/layanan/{service.id}/fields" class="btn-icon" title="Atur Field">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21"/></svg>
							</a>
							<button class="btn-icon" onclick={() => openEdit(service)} title="Edit">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
							<button class="btn-icon danger" onclick={() => openDelete(service)} title="Hapus">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
							</button>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="modal-overlay" onclick={() => { showCreateModal = false; }} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Tambah Layanan Baru</h3>
				<button class="modal-close" onclick={() => { showCreateModal = false; }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/create" use:enhance={() => {
				return async ({ update }) => {
					showCreateModal = false;
					await update();
				};
			}}>
				<div class="modal-body">
					<div class="form-group">
						<label for="create-name">Nama Layanan *</label>
						<input type="text" id="create-name" name="name" required placeholder="Contoh: Surat Keterangan Usaha" />
					</div>
					<div class="form-group">
						<label for="create-icon">Ikon (emoji)</label>
						<input type="text" id="create-icon" name="icon" placeholder="Contoh: 📄" />
					</div>
					<div class="form-group">
						<label for="create-requirements">Persyaratan</label>
						<textarea id="create-requirements" name="requirements" rows="4" placeholder="Tuliskan persyaratan layanan..."></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-outline" onclick={() => { showCreateModal = false; }}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if editingService}
	<div class="modal-overlay" onclick={closeEdit} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Edit Layanan</h3>
				<button class="modal-close" onclick={closeEdit}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/update" use:enhance={() => {
				return async ({ update }) => {
					editingService = null;
					await update();
				};
			}}>
				<input type="hidden" name="id" value={editingService.id} />
				<div class="modal-body">
					<div class="form-group">
						<label for="edit-name">Nama Layanan *</label>
						<input type="text" id="edit-name" name="name" required value={editingService.name} />
					</div>
					<div class="form-group">
						<label for="edit-icon">Ikon (emoji)</label>
						<input type="text" id="edit-icon" name="icon" value={editingService.icon || ''} />
					</div>
					<div class="form-group">
						<label for="edit-requirements">Persyaratan</label>
						<textarea id="edit-requirements" name="requirements" rows="4">{editingService.requirements || ''}</textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-outline" onclick={closeEdit}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan Perubahan</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingService}
	<div class="modal-overlay" onclick={closeDelete} role="presentation">
		<div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Hapus Layanan</h3>
				<button class="modal-close" onclick={closeDelete}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/delete" use:enhance={() => {
				return async ({ update }) => {
					deletingService = null;
					await update();
				};
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
					<button type="button" class="btn btn-outline" onclick={closeDelete}>Batal</button>
					<button type="submit" class="btn btn-danger" disabled={deletingService.submissionCount > 0}>Hapus</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.page-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
	}

	.page-desc {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0.2rem 0 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1rem;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
		border: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #800020, #a80030);
		color: white;
		box-shadow: 0 2px 8px rgba(128, 0, 32, 0.25);
	}

	.btn-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(128, 0, 32, 0.35);
	}

	.btn-outline {
		background: white;
		color: #374151;
		border: 1.5px solid #e5e7eb;
	}

	.btn-outline:hover {
		background: #f9fafb;
		border-color: #d1d5db;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background: #b91c1c;
	}

	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: #f3f4f6;
		border: none;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
	}

	.btn-icon:hover {
		background: #e5e7eb;
		color: #111827;
	}

	.btn-icon.danger:hover {
		background: #fef2f2;
		color: #dc2626;
	}

	/* Alerts */
	.alert {
		padding: 0.75rem 1rem;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.alert-success {
		background: #f0fdf4;
		color: #16a34a;
		border: 1px solid #bbf7d0;
	}

	.alert-error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	/* Services Grid */
	.services-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.service-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: white;
		border-radius: 14px;
		padding: 1.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid #f3f4f6;
		transition: all 0.2s;
	}

	.service-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.service-card.dragging {
		opacity: 0.5;
		border-color: #800020;
	}

	.drag-handle {
		cursor: grab;
		color: #9ca3af;
		flex-shrink: 0;
		padding: 0.25rem;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.service-icon-wrap {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: linear-gradient(135deg, #fdf2f8, #fce7f3);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: #be185d;
	}

	.service-emoji {
		font-size: 1.5rem;
	}

	.service-info {
		flex: 1;
		min-width: 0;
	}

	.service-name {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.25rem;
	}

	.service-meta {
		display: flex;
		gap: 1rem;
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.78rem;
		color: #6b7280;
	}

	.service-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		background: white;
		border-radius: 16px;
		border: 2px dashed #e5e7eb;
		color: #9ca3af;
	}

	.empty-state p {
		margin-top: 0.75rem;
		font-size: 0.9rem;
	}

	/* Modal */
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
		border-radius: 16px;
		width: 100%;
		max-width: 520px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: modalIn 0.2s ease-out;
	}

	.modal-sm {
		max-width: 420px;
	}

	@keyframes modalIn {
		from { opacity: 0; transform: scale(0.95) translateY(10px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #f3f4f6;
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
		border-radius: 8px;
		border: none;
		background: #f3f4f6;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s;
	}

	.modal-close:hover {
		background: #e5e7eb;
		color: #111827;
	}

	.modal-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.form-group label {
		font-size: 0.82rem;
		font-weight: 600;
		color: #374151;
	}

	.form-group input,
	.form-group textarea {
		padding: 0.6rem 0.85rem;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		font-size: 0.88rem;
		color: #1f2937;
		background: #f9fafb;
		font-family: inherit;
		transition: all 0.2s;
		resize: vertical;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #800020;
		box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1);
		background: white;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #f3f4f6;
	}

	.confirm-text {
		font-size: 0.9rem;
		color: #374151;
		margin: 0;
		line-height: 1.5;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.service-card {
			flex-wrap: wrap;
		}

		.service-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
