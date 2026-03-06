<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/stores/toast';


	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateModal = $state(false);
	let editingField = $state<any>(null);
	let deletingField = $state<any>(null);
	let reorderMode = $state(false);
	let draggedIndex = $state<number | null>(null);
	let localFields = $state([...data.fields]);

	// Auto-reopen modal if there's an error from server
	$effect(() => {
		if (form?.error && (form as any).values) {
			if (editingField?.id) {
				// We're in edit mode but the server returned values
				// For now let's focus on Create auto-reopen as per requirement
			} else {
				showCreateModal = true;
				// Repopulate create state from form.values if needed
				const vals = (form as any).values;
				createLabel = vals.label || '';
				createType = vals.type || 'text';
			}
		}
	});

	$effect(() => {
		localFields = [...data.fields];
	});

	// Handle form results
	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Operasi berhasil');
			showCreateModal = false;
			editingField = null;
			deletingField = null;
		} else if (form?.error) {
			toast.error(form.error);
		}
	});

	const fieldTypes = [
		{ value: 'text', label: 'Teks' },
		{ value: 'email', label: 'Email' },
		{ value: 'number', label: 'Angka' },
		{ value: 'telp', label: 'No. Telepon' },
		{ value: 'date', label: 'Tanggal' },
		{ value: 'textarea', label: 'Teks Panjang' },
		{ value: 'select', label: 'Dropdown/Pilihan' },
		{ value: 'radio', label: 'Radio Button' },
		{ value: 'checkbox', label: 'Checkbox' },
		{ value: 'file', label: 'Upload File' }
	];

	function getTypeLabel(type: string): string {
		if (type === 'telp') return 'No. Telepon';
		return fieldTypes.find((t) => t.value === type)?.label || type;
	}

	function needsOptions(type: string): boolean {
		return ['select', 'radio', 'checkbox'].includes(type);
	}

	function isFile(type: string): boolean {
		return type === 'file';
	}

	function isDate(type: string): boolean {
		return type === 'date';
	}

	// Slugify function for field name
	function slugify(text: string): string {
		return text
			.toString()
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '_')           // Replace spaces with _
			.replace(/[^\w-]+/g, '')        // Remove all non-word chars
			.replace(/--+/g, '_')           // Replace multiple - with single _
			.replace(/^-+/, '')             // Trim - from start of text
			.replace(/-+$/, '');            // Trim - from end of text
	}

	// Create form state
	let createLabel = $state('');
	let createType = $state('text');
	let createNameManual = $state(false);
	let createName = $state('');

	$effect(() => {
		if (!createNameManual) {
			createName = slugify(createLabel);
		}
	});

	// Edit form state
	let editType = $state('text');
	let editMeta = $state<any>({});

	function openCreate() {
		showCreateModal = true;
		createLabel = '';
		createType = 'text';
		createName = '';
		createNameManual = false;
	}

	function openEdit(field: any) {
		editingField = { ...field };
		editType = field.type;
		try {
			editMeta = field.meta ? JSON.parse(field.meta) : {};
		} catch {
			editMeta = {};
		}
	}

	function handleDragStart(index: number) { draggedIndex = index; }
	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;
		const items = [...localFields];
		const [d] = items.splice(draggedIndex, 1);
		items.splice(index, 0, d);
		localFields = items;
		draggedIndex = index;
	}
	function handleDragEnd() { draggedIndex = null; }

	// Get next order
	let nextOrder = $derived(localFields.length > 0 ? Math.max(...localFields.map(f => f.order)) + 1 : 1);
</script>

<svelte:head>
	<title>Atur Field — {data.service?.name || 'Layanan'}</title>
</svelte:head>

<div class="page">
	<!-- Breadcrumb & Header -->
	<div class="breadcrumb">
		<a href="/admin/layanan">← Kembali ke Layanan</a>
	</div>

	<div class="page-header">
		<div>
			<h2 class="page-title">
				{#if data.service?.icon}<span class="title-icon">{data.service.icon}</span>{/if}
				Atur Field — {data.service?.name || 'Layanan'}
			</h2>
			<p class="page-desc">Kelola field formulir yang perlu diisi pemohon</p>
		</div>
		<div class="header-actions">
			{#if reorderMode}
				<form method="POST" action="?/reorder" use:enhance={() => {
					return async ({ update }) => { 
						reorderMode = false; 
						await update({ reset: false }); 
					};
				}}>
					<input type="hidden" name="order" value={JSON.stringify(localFields.map((f, i) => ({ id: f.id, order: i })))} />
					<button type="submit" class="btn btn-primary">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						Simpan Urutan
					</button>
				</form>
				<button class="btn btn-outline" onclick={() => { reorderMode = false; localFields = [...data.fields]; }}>Batal</button>
			{:else}
				{#if localFields.length > 1}
					<button class="btn btn-outline" onclick={() => { reorderMode = true; }}>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
						Atur Urutan
					</button>
				{/if}
				<button class="btn btn-primary" onclick={openCreate}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Tambah Field
				</button>
			{/if}
		</div>
	</div>



	<!-- Fields List -->
	<div class="fields-list">
		{#if localFields.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
				</svg>
				<p>Belum ada field. Tambahkan field formulir pertama!</p>
			</div>
		{:else}
			{#each localFields as field, index}
				<div
					class="field-card"
					class:dragging={reorderMode && draggedIndex === index}
					draggable={reorderMode}
					ondragstart={() => handleDragStart(index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragend={handleDragEnd}
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

					<div class="field-order">{index + 1}</div>

					<div class="field-info">
						<div class="field-header-row">
							<h4 class="field-label">{field.label}</h4>
							{#if field.is_required}
								<span class="required-badge">Wajib</span>
							{/if}
						</div>
						<div class="field-meta-row">
							<span class="type-badge">{getTypeLabel(field.type)}</span>
							<code class="field-name-code">{field.name}</code>
							{#if field.placeholder}
								<span class="field-placeholder">"{field.placeholder}"</span>
							{/if}
						</div>
						{#if field.help_text}
							<p class="field-help">{field.help_text}</p>
						{/if}
						{#if field.options && needsOptions(field.type)}
							<p class="field-options">Opsi: {field.options}</p>
						{/if}
					</div>

					{#if !reorderMode}
						<div class="field-actions">
							<button class="btn-icon" onclick={() => openEdit(field)} title="Edit">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
							<button class="btn-icon danger" onclick={() => { deletingField = field; }} title="Hapus">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
							</button>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Create Field Modal -->
{#if showCreateModal}
	<div class="modal-overlay" onclick={() => { showCreateModal = false; }} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Tambah Field Baru</h3>
				<button class="modal-close" onclick={() => { showCreateModal = false; }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/create" use:enhance={() => {
				return async ({ update }) => { await update({ reset: false }); };
			}}>
				<div class="modal-body">

					
					<div class="form-row">
						<div class="form-group flex-2">
							<label for="c-label">Label *</label>
							<input type="text" id="c-label" name="label" required placeholder="Contoh: Nama Lengkap" bind:value={createLabel} />
						</div>
						<div class="form-group flex-1">
							<label for="c-name">Nama Field *</label>
							<input 
								type="text" 
								id="c-name" 
								name="name" 
								required 
								placeholder="nama_lengkap" 
								bind:value={createName}
								oninput={() => createNameManual = true}
							/>
						</div>
					</div>
					<div class="form-row">
						<div class="form-group flex-1">
							<label for="c-type">Tipe *</label>
							<select id="c-type" name="type" bind:value={createType}>
								{#each fieldTypes as ft}
									<option value={ft.value}>{ft.label}</option>
								{/each}
							</select>
						</div>
						<div class="form-group flex-1">
							<label for="c-order">Urutan *</label>
							<input type="number" id="c-order" name="order" required value={nextOrder} />
						</div>
					</div>

					<div class="form-group">
						<label for="c-required">Wajib diisi?</label>
						<select id="c-required" name="is_required">
							<option value="off">Tidak</option>
							<option value="on">Ya</option>
						</select>
					</div>

					<div class="form-group">
						<label for="c-placeholder">Contoh Isi (Placeholder)</label>
						<input type="text" id="c-placeholder" name="placeholder" placeholder="Teks bayangan..." />
					</div>

					<div class="form-group">
						<label for="c-help">Teks Bantuan (Help Text)</label>
						<input type="text" id="c-help" name="help_text" placeholder="Petunjuk di bawah input..." />
					</div>

					<!-- Dynamic Inputs -->
					{#if needsOptions(createType)}
						<div class="form-group">
							<label for="c-options">Opsi (Tiap Baris = Satu Pilihan)</label>
							<textarea id="c-options" name="options" rows="4" placeholder="Pilihan 1&#10;Pilihan 2&#10;Pilihan 3"></textarea>
						</div>
					{:else}
						<input type="hidden" name="options" value="" />
					{/if}

					{#if isFile(createType)}
						<div class="form-row">
							<div class="form-group flex-1">
								<label for="c-mimes">Tipe File (Mimes)</label>
								<select id="c-mimes" name="mimes">
									<option value="pdf">PDF</option>
									<option value="jpeg,png">JPEG/PNG</option>
									<option value="pdf,jpeg,png">PDF/JPEG/PNG</option>
								</select>
							</div>
							<div class="form-group flex-1">
								<label for="c-max-size">Ukuran Maks (KB)</label>
								<input type="number" id="c-max-size" name="max_size" value="2048" />
							</div>
						</div>
					{/if}

					{#if isDate(createType)}
						<div class="form-group">
							<label for="c-date-mode">Mode Tanggal</label>
							<select id="c-date-mode" name="date_mode">
								<option value="free">Bebas</option>
								<option value="future">Hari ini & setelahnya</option>
							</select>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-outline" onclick={() => { showCreateModal = false; }}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Field Modal -->
{#if editingField}
	<div class="modal-overlay" onclick={() => { editingField = null; }} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Edit Field</h3>
				<button class="modal-close" onclick={() => { editingField = null; }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/update" use:enhance={() => {
				return async ({ update }) => { await update({ reset: false }); };
			}}>
				<input type="hidden" name="id" value={editingField.id} />
				<div class="modal-body">
					<div class="form-row">
						<div class="form-group flex-2">
							<label for="e-label">Label *</label>
							<input type="text" id="e-label" name="label" required value={editingField.label} />
						</div>
						<div class="form-group flex-1">
							<label for="e-name">Nama Field *</label>
							<input type="text" id="e-name" name="name" required value={editingField.name} />
						</div>
					</div>
					<div class="form-row">
						<div class="form-group flex-1">
							<label for="e-type">Tipe *</label>
							<select id="e-type" name="type" bind:value={editType}>
								{#each fieldTypes as ft}
									<option value={ft.value}>{ft.label}</option>
								{/each}
							</select>
						</div>
						<div class="form-group flex-1">
							<label for="e-order">Urutan *</label>
							<input type="number" id="e-order" name="order" required value={editingField.order} />
						</div>
					</div>

					<div class="form-group">
						<label for="e-required">Wajib diisi?</label>
						<select id="e-required" name="is_required">
							<option value="off" selected={!editingField.is_required}>Tidak</option>
							<option value="on" selected={editingField.is_required}>Ya</option>
						</select>
					</div>

					<div class="form-group">
						<label for="e-placeholder">Contoh Isi (Placeholder)</label>
						<input type="text" id="e-placeholder" name="placeholder" value={editingField.placeholder || ''} />
					</div>

					<div class="form-group">
						<label for="e-help">Teks Bantuan (Help Text)</label>
						<input type="text" id="e-help" name="help_text" value={editingField.help_text || ''} />
					</div>

					<!-- Dynamic Inputs -->
					{#if needsOptions(editType)}
						<div class="form-group">
							<label for="e-options">Opsi (Tiap Baris = Satu Pilihan)</label>
							<textarea id="e-options" name="options" rows="4" value={editingField.options || ''}></textarea>
						</div>
					{:else}
						<input type="hidden" name="options" value="" />
					{/if}

					{#if isFile(editType)}
						<div class="form-row">
							<div class="form-group flex-1">
								<label for="e-mimes">Tipe File (Mimes)</label>
								<select id="e-mimes" name="mimes" value={editMeta.mimes || 'pdf'}>
									<option value="pdf">PDF</option>
									<option value="jpeg,png">JPEG/PNG</option>
									<option value="pdf,jpeg,png">PDF/JPEG/PNG</option>
								</select>
							</div>
							<div class="form-group flex-1">
								<label for="e-max-size">Ukuran Maks (KB)</label>
								<input type="number" id="e-max-size" name="max_size" value={editMeta.max_size || '2048'} />
							</div>
						</div>
					{/if}

					{#if isDate(editType)}
						<div class="form-group">
							<label for="e-date-mode">Mode Tanggal</label>
							<select id="e-date-mode" name="date_mode" value={editMeta.date_mode || 'free'}>
								<option value="free">Bebas</option>
								<option value="future">Hari ini & setelahnya</option>
							</select>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-outline" onclick={() => { editingField = null; }}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan Perubahan</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Modal -->
{#if deletingField}
	<div class="modal-overlay" onclick={() => { deletingField = null; }} role="presentation">
		<div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Hapus Field</h3>
				<button class="modal-close" onclick={() => { deletingField = null; }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/delete" use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}>
				<input type="hidden" name="id" value={deletingField.id} />
				<div class="modal-body">
					<p class="confirm-text">Apakah Anda yakin ingin menghapus field <strong>"{deletingField.label}"</strong>?</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-outline" onclick={() => { deletingField = null; }}>Batal</button>
					<button type="submit" class="btn btn-danger">Hapus</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page { max-width: 1000px; margin: 0 auto; }

	.breadcrumb { margin-bottom: 1rem; }
	.breadcrumb a {
		font-size: 0.85rem; color: #6b7280; text-decoration: none;
		transition: color 0.2s;
	}
	.breadcrumb a:hover { color: #800020; }

	.page-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
	}
	.page-title { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
	.title-icon { font-size: 1.5rem; }
	.page-desc { font-size: 0.85rem; color: #6b7280; margin: 0.2rem 0 0; }
	.header-actions { display: flex; gap: 0.5rem; }

	/* Buttons */
	.btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: none; }
	.btn-primary { background: linear-gradient(135deg, #800020, #a80030); color: white; box-shadow: 0 2px 8px rgba(128, 0, 32, 0.25); }
	.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(128, 0, 32, 0.35); }
	.btn-outline { background: white; color: #374151; border: 1.5px solid #e5e7eb; }
	.btn-outline:hover { background: #f9fafb; border-color: #d1d5db; }
	.btn-danger { background: #dc2626; color: white; }
	.btn-danger:hover { background: #b91c1c; }
	.btn-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: #f3f4f6; border: none; color: #374151; cursor: pointer; transition: all 0.2s; }
	.btn-icon:hover { background: #e5e7eb; color: #111827; }
	.btn-icon.danger:hover { background: #fef2f2; color: #dc2626; }

	/* Alerts */
	.alert { padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 500; margin-bottom: 1rem; }
	.alert-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
	.alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

	/* Fields List */
	.fields-list { display: flex; flex-direction: column; gap: 0.5rem; }

	.field-card {
		display: flex; align-items: center; gap: 1rem;
		background: white; border-radius: 12px; padding: 1rem 1.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); border: 1px solid #f3f4f6;
		transition: all 0.2s;
	}
	.field-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
	.field-card.dragging { opacity: 0.5; border-color: #800020; }

	.drag-handle { cursor: grab; color: #9ca3af; flex-shrink: 0; }
	.drag-handle:active { cursor: grabbing; }

	.field-order {
		width: 32px; height: 32px; border-radius: 8px;
		background: #f3f4f6; display: flex; align-items: center; justify-content: center;
		font-size: 0.8rem; font-weight: 700; color: #6b7280; flex-shrink: 0;
	}

	.field-info { flex: 1; min-width: 0; }
	.field-header-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
	.field-label { font-size: 0.95rem; font-weight: 600; color: #111827; margin: 0; }
	.required-badge { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.4rem; border-radius: 4px; background: #fef2f2; color: #dc2626; }

	.field-meta-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
	.type-badge { font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; background: #eef2ff; color: #4f46e5; }
	.field-name-code { font-size: 0.72rem; background: #f3f4f6; padding: 0.1rem 0.4rem; border-radius: 4px; color: #6b7280; }
	.field-placeholder { font-size: 0.72rem; color: #9ca3af; font-style: italic; }

	.field-help { font-size: 0.75rem; color: #9ca3af; margin: 0.25rem 0 0; }
	.field-options { font-size: 0.75rem; color: #6b7280; margin: 0.2rem 0 0; }

	.field-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

	/* Empty State */
	.empty-state { text-align: center; padding: 3rem 2rem; background: white; border-radius: 16px; border: 2px dashed #e5e7eb; color: #9ca3af; }
	.empty-state p { margin-top: 0.75rem; font-size: 0.9rem; }

	/* Modal */
	.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
	.modal { background: white; border-radius: 16px; width: 100%; max-width: 580px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: modalIn 0.2s ease-out; }
	.modal-sm { max-width: 420px; }
	@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

	.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f3f4f6; }
	.modal-header h3 { font-size: 1.05rem; font-weight: 700; color: #111827; margin: 0; }
	.modal-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: none; background: #f3f4f6; color: #6b7280; cursor: pointer; transition: all 0.2s; }
	.modal-close:hover { background: #e5e7eb; color: #111827; }

	.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.85rem; }
	.modal-footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding: 1rem 1.5rem; border-top: 1px solid #f3f4f6; }

	.form-row { display: flex; gap: 0.75rem; }
	.flex-1 { flex: 1; }
	.flex-2 { flex: 2; }

	.form-group { display: flex; flex-direction: column; gap: 0.3rem; }
	.form-group label { font-size: 0.8rem; font-weight: 600; color: #374151; }
	.form-group input, .form-group textarea, .form-group select {
		padding: 0.55rem 0.75rem; border: 1.5px solid #e5e7eb; border-radius: 10px;
		font-size: 0.85rem; color: #1f2937; background: #f9fafb; font-family: inherit; transition: all 0.2s;
	}
	.form-group input:focus, .form-group textarea:focus, .form-group select:focus {
		outline: none; border-color: #800020; box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1); background: white;
	}

	.form-group-inline { display: flex; align-items: center; }
	.form-group-inline label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #374151; cursor: pointer; }
	.form-group-inline input[type="checkbox"] { width: 18px; height: 18px; accent-color: #800020; }

	.confirm-text { font-size: 0.9rem; color: #374151; margin: 0; line-height: 1.5; }

	@media (max-width: 640px) {
		.page-header { flex-direction: column; align-items: flex-start; }
		.form-row { flex-direction: column; }
		.field-card { flex-wrap: wrap; }
		.field-actions { width: 100%; justify-content: flex-end; }
	}
</style>
