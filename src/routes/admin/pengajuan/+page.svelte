<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let filterLayanan = $state(data.filters.layanan);
	let filterStatus = $state(data.filters.status);
	let filterCari = $state(data.filters.cari);
	let filterDari = $state(data.filters.dari);
	let filterSampai = $state(data.filters.sampai);

	$effect(() => {
		filterLayanan = data.filters.layanan;
		filterStatus = data.filters.status;
		filterCari = data.filters.cari;
		filterDari = data.filters.dari;
		filterSampai = data.filters.sampai;
	});

	const statusLabels: Record<string, string> = {
		baru: 'Baru', ditugaskan: 'Ditugaskan', diproses_pic: 'Diproses PIC',
		ditolak_pic: 'Ditolak PIC', diselesaikan_pic: 'Diselesaikan PIC',
		disetujui_pic: 'Disetujui PIC', ditolak_pengajuan: 'Ditolak', selesai: 'Selesai'
	};
	const statusColors: Record<string, string> = {
		baru: 'blue', ditugaskan: 'amber', diproses_pic: 'indigo',
		ditolak_pic: 'orange', diselesaikan_pic: 'teal',
		disetujui_pic: 'cyan', ditolak_pengajuan: 'red', selesai: 'green'
	};

	function getStatusLabel(s: string) { return statusLabels[s] || s; }
	function getStatusColor(s: string) { return statusColors[s] || 'gray'; }

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function applyFilters() {
		const p = new URLSearchParams();
		if (filterLayanan) p.set('layanan', filterLayanan);
		if (filterStatus) p.set('status', filterStatus);
		if (filterCari) p.set('cari', filterCari);
		if (filterDari) p.set('dari', filterDari);
		if (filterSampai) p.set('sampai', filterSampai);
		goto(`/admin/pengajuan?${p.toString()}`);
	}

	function resetFilters() {
		filterLayanan = ''; filterStatus = ''; filterCari = ''; filterDari = ''; filterSampai = '';
		goto('/admin/pengajuan');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('halaman', p.toString());
		goto(`/admin/pengajuan?${params.toString()}`);
	}

	let hasActiveFilter = $derived(!!data.filters.layanan || !!data.filters.status || !!data.filters.cari || !!data.filters.dari || !!data.filters.sampai);
</script>

<svelte:head><title>Pengajuan — Layanan Digital</title></svelte:head>

<div class="page">
	<div class="page-header">
		<div>
			<h2 class="page-title">Kelola Pengajuan</h2>
			<p class="page-desc">Lihat dan kelola semua pengajuan layanan digital</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="filters-card">
		<div class="filters-header">
			<h3 class="section-title">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
				Filter & Cari
			</h3>
			{#if hasActiveFilter}
				<button class="reset-btn" onclick={resetFilters}>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					Reset
				</button>
			{/if}
		</div>
		<div class="filters-grid">
			<div class="filter-group span-2">
				<label for="f-cari">Cari</label>
				<input type="text" id="f-cari" bind:value={filterCari} placeholder="Nama, email, atau kode tracking..." onkeydown={(e) => { if (e.key === 'Enter') applyFilters(); }} />
			</div>
			<div class="filter-group">
				<label for="f-layanan">Layanan</label>
				<select id="f-layanan" bind:value={filterLayanan}>
					<option value="">Semua</option>
					{#each data.services as s}<option value={s.id}>{s.name}</option>{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="f-status">Status</label>
				<select id="f-status" bind:value={filterStatus}>
					<option value="">Semua</option>
					{#each Object.entries(statusLabels) as [v, l]}<option value={v}>{l}</option>{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="f-dari">Dari</label>
				<input type="date" id="f-dari" bind:value={filterDari} />
			</div>
			<div class="filter-group">
				<label for="f-sampai">Sampai</label>
				<input type="date" id="f-sampai" bind:value={filterSampai} />
			</div>
		</div>
		<div class="filters-actions">
			<div class="export-actions">
				<a href="/admin/pengajuan/export/csv?{new URLSearchParams($page.url.searchParams).toString()}" class="export-btn csv">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 12h8"/><path d="M8 16h8"/></svg>
					Export CSV
				</a>
				<a href="/admin/pengajuan/export/pdf?{new URLSearchParams($page.url.searchParams).toString()}" class="export-btn pdf">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13v-3h6v3"/><path d="M9 17v-3h6v3"/></svg>
					Cetak PDF
				</a>
			</div>
			<button class="filter-apply-btn" onclick={applyFilters}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				Terapkan Filter
			</button>
		</div>
	</div>

	<!-- Table -->
	<div class="table-card">
		<div class="table-header">
			<h3 class="section-title">Daftar Pengajuan</h3>
			<span class="table-count">{data.pagination.total} pengajuan</span>
		</div>

		{#if data.submissions.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
				<p>Tidak ada pengajuan ditemukan.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Kode Tracking</th>
							<th>Pemohon</th>
							<th>Layanan</th>
							<th>Status</th>
							<th>PIC</th>
							<th>Tanggal</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.submissions as sub}
							<tr>
								<td>
									<div class="code-with-icon">
										<code class="tracking-code">{sub.tracking_code}</code>
									</div>
								</td>
								<td>
									<div class="applicant-info">
										<div class="name-with-badge">
											<span class="applicant-name">{sub.applicant_name}</span>
											{#if sub.is_priority}<span class="priority-badge">Prioritas</span>{/if}
											{#if sub.userRoleInSubmission}
												<span class="role-badge {sub.userRoleInSubmission === 'PIC Utama' ? 'primary' : 'assistant'}">
													{sub.userRoleInSubmission}
												</span>
											{/if}
										</div>
										<span class="applicant-email">{sub.applicant_email}</span>
									</div>
								</td>
								<td>{sub.service_name}</td>
								<td><span class="status-badge {getStatusColor(sub.status)}">{getStatusLabel(sub.status)}</span></td>
								<td>{sub.assigned_to_name || '-'}</td>
								<td class="date-cell">{formatDate(sub.created_at)}</td>
								<td>
									<a href="/admin/pengajuan/{sub.id}" class="detail-link">Detail →</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if data.pagination.totalPages > 1}
				<div class="pagination">
					<button
						class="page-btn"
						disabled={data.pagination.page <= 1}
						onclick={() => goToPage(data.pagination.page - 1)}
					>
						← Sebelumnya
					</button>

					<div class="page-numbers">
						{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as p}
							{#if p === 1 || p === data.pagination.totalPages || (p >= data.pagination.page - 2 && p <= data.pagination.page + 2)}
								<button
									class="page-num"
									class:active={p === data.pagination.page}
									onclick={() => goToPage(p)}
								>
									{p}
								</button>
							{:else if p === data.pagination.page - 3 || p === data.pagination.page + 3}
								<span class="page-dots">...</span>
							{/if}
						{/each}
					</div>

					<button
						class="page-btn"
						disabled={data.pagination.page >= data.pagination.totalPages}
						onclick={() => goToPage(data.pagination.page + 1)}
					>
						Selanjutnya →
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.page { max-width: 1200px; margin: 0 auto; }
	.page-header { margin-bottom: 1.5rem; }
	.page-title { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
	.page-desc { font-size: 0.85rem; color: #6b7280; margin: 0.2rem 0 0; }
	.section-title { font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0; display: flex; align-items: center; gap: 0.5rem; }

	.filters-card { background: white; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
	.filters-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
	.reset-btn { display: inline-flex; align-items: center; gap: 0.3rem; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.78rem; font-weight: 500; cursor: pointer; font-family: inherit; }
	.reset-btn:hover { background: #fee2e2; }
	.filters-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.75rem; }
	.span-2 { grid-column: span 2; }
	.filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
	.filter-group label { font-size: 0.78rem; font-weight: 600; color: #374151; }
	.filter-group select, .filter-group input { padding: 0.55rem 0.75rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.85rem; color: #1f2937; background: #f9fafb; font-family: inherit; transition: all 0.2s; }
	.filter-group select:focus, .filter-group input:focus { outline: none; border-color: #800020; box-shadow: 0 0 0 3px rgba(128,0,32,0.1); background: white; }
	.filters-actions { margin-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; }
	.export-actions { display: flex; gap: 0.5rem; }
	.export-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.82rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s; border: 1.5px solid transparent; }
	
	.export-btn.csv { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
	.export-btn.csv:hover { background: #dcfce7; transform: translateY(-1px); }
	
	.export-btn.pdf { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
	.export-btn.pdf:hover { background: #fee2e2; transform: translateY(-1px); }

	.filter-apply-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.25rem; background: linear-gradient(135deg, #800020, #a80030); color: white; border: none; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: 0 2px 8px rgba(128,0,32,0.25); }
	.filter-apply-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(128,0,32,0.35); }

	.table-card { background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; overflow: hidden; }
	.table-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem; border-bottom: 1px solid #f3f4f6; }
	.table-count { font-size: 0.8rem; color: #6b7280; font-weight: 500; }
	.table-wrapper { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	thead { background: #f9fafb; }
	th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
	td { padding: 0.85rem 1rem; font-size: 0.85rem; color: #374151; border-top: 1px solid #f3f4f6; }
	tbody tr { transition: background 0.15s; }
	tbody tr:hover { background: #fafafa; }
	.tracking-code { background: #f3f4f6; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #374151; }
	.code-with-icon { display: flex; align-items: center; gap: 0.4rem; }
	.priority-icon { color: #d97706; font-size: 1rem; filter: drop-shadow(0 0 2px rgba(217,119,6,0.2)); }
	
	.applicant-info { display: flex; flex-direction: column; }
	.name-with-badge { display: flex; align-items: center; gap: 0.5rem; }
	.priority-badge { background: #fef2f2; color: #dc2626; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px; text-transform: uppercase; border: 1px solid #fee2e2; }
	.applicant-name { font-weight: 600; color: #111827; }
	.applicant-email { font-size: 0.75rem; color: #9ca3af; }

	.role-badge {
		font-size: 0.65rem;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.role-badge.primary {
		background: #ebf5ff;
		color: #1e40af;
		border: 1px solid #bfdbfe;
	}
	.role-badge.assistant {
		background: #f0fdf4;
		color: #166534;
		border: 1px solid #bbf7d0;
	}
	.status-badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
	.status-badge.blue { background: #eff6ff; color: #2563eb; }
	.status-badge.amber { background: #fffbeb; color: #d97706; }
	.status-badge.indigo { background: #eef2ff; color: #4f46e5; }
	.status-badge.orange { background: #fff7ed; color: #ea580c; }
	.status-badge.teal { background: #f0fdfa; color: #0d9488; }
	.status-badge.cyan { background: #ecfeff; color: #0891b2; }
	.status-badge.green { background: #f0fdf4; color: #16a34a; }
	.status-badge.red { background: #fef2f2; color: #dc2626; }
	.status-badge.gray { background: #f9fafb; color: #6b7280; }
	.date-cell { white-space: nowrap; font-size: 0.8rem; color: #6b7280; }
	.detail-link { color: #800020; font-weight: 600; font-size: 0.82rem; text-decoration: none; white-space: nowrap; }
	.detail-link:hover { text-decoration: underline; }

	.empty-state { padding: 3rem 2rem; text-align: center; color: #9ca3af; }
	.empty-state p { margin-top: 0.75rem; font-size: 0.9rem; }

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid #f3f4f6;
	}

	.page-btn {
		padding: 0.45rem 1rem;
		background: white;
		border: 1.5px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.8rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
	}

	.page-btn:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #d1d5db;
	}

	.page-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.page-num {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		border: 1.5px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.8rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
	}

	.page-num:hover {
		background: #f9fafb;
	}

	.page-num.active {
		background: #800020;
		color: white;
		border-color: #800020;
	}

	.page-dots {
		color: #9ca3af;
		font-size: 0.8rem;
		padding: 0 0.25rem;
	}

	@media (max-width: 1024px) { .filters-grid { grid-template-columns: repeat(3, 1fr); } .span-2 { grid-column: span 3; } }
	@media (max-width: 640px) { .filters-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
</style>
