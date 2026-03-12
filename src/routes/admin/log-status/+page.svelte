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
		goto(`/admin/log-status?${p.toString()}`);
	}

	function resetFilters() {
		filterLayanan = ''; filterStatus = ''; filterCari = ''; filterDari = ''; filterSampai = '';
		goto('/admin/log-status');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('halaman', p.toString());
		goto(`/admin/log-status?${params.toString()}`);
	}

	let hasActiveFilter = $derived(!!data.filters.layanan || !!data.filters.status || !!data.filters.cari || !!data.filters.dari || !!data.filters.sampai);
</script>

<svelte:head><title>Log Status — Layanan Digital</title></svelte:head>

<div class="page">
	<div class="page-header">
		<div>
			<h2 class="page-title">Log Status</h2>
			<p class="page-desc">Riwayat semua perubahan status pengajuan</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="filters-card">
		<div class="filters-header">
			<h3 class="section-title">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
				Filter
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
				<input type="text" id="f-cari" bind:value={filterCari} placeholder="Kode tracking atau catatan..." onkeydown={(e) => { if (e.key === 'Enter') applyFilters(); }} />
			</div>
			<div class="filter-group">
				<label for="f-layanan">Layanan</label>
				<select id="f-layanan" bind:value={filterLayanan}>
					<option value="">Semua</option>
					{#each data.services as s}<option value={s.id}>{s.name}</option>{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="f-status">Status Ke</label>
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
				<a
					href="/admin/log-status/export/csv?{$page.url.searchParams.toString()}"
					class="export-btn csv"
					download
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
					Export CSV
				</a>
				<a
					href="/admin/log-status/export/pdf?{$page.url.searchParams.toString()}"
					class="export-btn pdf"
					target="_blank"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
					Cetak PDF
				</a>
			</div>
			<button class="filter-apply-btn" onclick={applyFilters}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				Terapkan
			</button>
		</div>
	</div>

	<!-- Table -->
	<div class="table-card">
		<div class="table-header">
			<h3 class="section-title">Riwayat Log</h3>
			<span class="table-count">{data.pagination.total} log</span>
		</div>

		{#if data.logs.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
				<p>Belum ada log status.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Tanggal</th>
							<th>Tracking</th>
							<th>Pemohon</th>
							<th>Layanan</th>
							<th>Perubahan</th>
							<th>Catatan</th>
							<th>Oleh</th>
						</tr>
					</thead>
					<tbody>
						{#each data.logs as log}
							<tr>
								<td class="date-cell">{formatDate(log.created_at)}</td>
								<td>
									<a href="/admin/pengajuan/{log.submission_id}" class="tracking-link">{log.tracking_code}</a>
								</td>
								<td class="name-cell">{log.applicant_name}</td>
								<td>{log.service_name}</td>
								<td>
									<div class="status-transition">
										{#if log.status_from}
											<span class="status-badge sm {getStatusColor(log.status_from)}">{getStatusLabel(log.status_from)}</span>
											<span class="arrow">→</span>
										{/if}
										{#if log.status_to}
											<span class="status-badge sm {getStatusColor(log.status_to)}">{getStatusLabel(log.status_to)}</span>
										{:else}
											<span class="note-only">Catatan</span>
										{/if}
									</div>
								</td>
								<td class="note-cell">{log.note || '-'}</td>
								<td class="user-cell">{log.user_name}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if data.pagination.totalPages > 1}
				<div class="pagination">
					<button class="page-btn" disabled={data.pagination.page <= 1} onclick={() => goToPage(data.pagination.page - 1)}>←</button>
					<span class="page-info">Hal. {data.pagination.page} / {data.pagination.totalPages}</span>
					<button class="page-btn" disabled={data.pagination.page >= data.pagination.totalPages} onclick={() => goToPage(data.pagination.page + 1)}>→</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.page { max-width: 1200px; margin: 0 auto; }
	.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
	.page-title { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
	.page-desc { font-size: 0.85rem; color: #6b7280; margin: 0.2rem 0 0; }
	.section-title { font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0; display: flex; align-items: center; gap: 0.5rem; }

	.btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: none; }
	.btn-outline { background: white; color: #374151; border: 1.5px solid #e5e7eb; }
	.btn-outline:hover { background: #f9fafb; border-color: #d1d5db; }

	.filters-card { background: white; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
	.filters-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
	.reset-btn { display: inline-flex; align-items: center; gap: 0.3rem; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.78rem; font-weight: 500; cursor: pointer; font-family: inherit; }
	.reset-btn:hover { background: #fee2e2; }
	.filters-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.75rem; }
	.span-2 { grid-column: span 2; }
	.filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
	.filter-group label { font-size: 0.78rem; font-weight: 600; color: #374151; }
	.filter-group select, .filter-group input { padding: 0.55rem 0.75rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.85rem; color: #1f2937; background: #f9fafb; font-family: inherit; transition: all 0.2s; }
	.filter-group select:focus, .filter-group input:focus { outline: none; border-color: #800020; box-shadow: 0 0 0 3px rgba(128,0,32,0.1); background: white; }
	.filters-actions { margin-top: 0.75rem; display: flex; align-items: center; justify-content: space-between; }
	.export-actions { display: flex; gap: 0.6rem; }
	.filter-apply-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.25rem; background: linear-gradient(135deg, #800020, #a80030); color: white; border: none; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: 0 2px 8px rgba(128,0,32,0.25); }
	.filter-apply-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(128,0,32,0.35); }

	.table-card { background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; overflow: hidden; }
	.table-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f3f4f6; }
	.table-header-left { display: flex; align-items: baseline; gap: 0.75rem; }
	.table-actions { display: flex; gap: 0.75rem; }
	.export-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.9rem; border-radius: 10px; font-size: 0.8rem; font-weight: 600; text-decoration: none; transition: all 0.2s; border: 1.5px solid transparent; }
	.export-btn.csv { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
	.export-btn.csv:hover { background: #d1fae5; transform: translateY(-1px); }
	.export-btn.pdf { background: #fff1f2; color: #e11d48; border-color: #fecdd3; }
	.export-btn.pdf:hover { background: #ffe4e6; transform: translateY(-1px); }
	.table-count { font-size: 0.8rem; color: #6b7280; font-weight: 500; }
	.page-actions { display: flex; gap: 0.75rem; align-items: center; }
	.table-wrapper { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	thead { background: #f9fafb; }
	th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
	td { padding: 0.75rem 1rem; font-size: 0.85rem; color: #374151; border-top: 1px solid #f3f4f6; }
	tbody tr { transition: background 0.15s; }
	tbody tr:hover { background: #fafafa; }

	.date-cell { white-space: nowrap; font-size: 0.78rem; color: #6b7280; }
	.tracking-link { color: #800020; font-weight: 600; font-size: 0.82rem; text-decoration: none; }
	.tracking-link:hover { text-decoration: underline; }
	.name-cell { font-weight: 500; }

	.status-transition { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
	.arrow { font-size: 0.75rem; color: #9ca3af; }
	.note-only { font-size: 0.72rem; font-weight: 600; color: #6b7280; background: #f3f4f6; padding: 0.15rem 0.4rem; border-radius: 4px; }

	.status-badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
	.status-badge.sm { padding: 0.15rem 0.4rem; font-size: 0.68rem; }
	.status-badge.blue { background: #eff6ff; color: #2563eb; }
	.status-badge.amber { background: #fffbeb; color: #d97706; }
	.status-badge.indigo { background: #eef2ff; color: #4f46e5; }
	.status-badge.orange { background: #fff7ed; color: #ea580c; }
	.status-badge.teal { background: #f0fdfa; color: #0d9488; }
	.status-badge.cyan { background: #ecfeff; color: #0891b2; }
	.status-badge.green { background: #f0fdf4; color: #16a34a; }
	.status-badge.red { background: #fef2f2; color: #dc2626; }
	.status-badge.gray { background: #f9fafb; color: #6b7280; }

	.note-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.82rem; color: #6b7280; }
	.user-cell { white-space: nowrap; font-size: 0.82rem; }

	.empty-state { padding: 3rem 2rem; text-align: center; color: #9ca3af; }
	.empty-state p { margin-top: 0.75rem; font-size: 0.9rem; }

	.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; border-top: 1px solid #f3f4f6; }
	.page-btn { padding: 0.45rem 0.75rem; background: white; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-family: inherit; }
	.page-btn:hover:not(:disabled) { background: #f9fafb; }
	.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.page-info { font-size: 0.82rem; color: #6b7280; }

	@media (max-width: 1024px) { .filters-grid { grid-template-columns: repeat(3, 1fr); } .span-2 { grid-column: span 3; } }
	@media (max-width: 640px) { .filters-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
</style>
