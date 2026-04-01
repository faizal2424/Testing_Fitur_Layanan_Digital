<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import { statusLabels, getStatusLabel, getStatusColor } from '$lib/utils/submissionFlow';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';

	let { data }: { data: PageData } = $props();

	let filterLayanan = $state(data.filters.layanan);
	let filterStatus = $state(data.filters.status);
	let filterCari = $state(data.filters.cari);
	let filterDari = $state(data.filters.dari);
	let filterSampai = $state(data.filters.sampai);

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
				Terapkan Filter
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
											<StatusBadge status={log.status_from} size="sm" />
											<span class="arrow">→</span>
										{/if}
										{#if log.status_to}
											<StatusBadge status={log.status_to} size="sm" />
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
	/* All styles moved to admin.css */
</style>
