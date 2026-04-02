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

	$effect(() => {
		filterLayanan = data.filters.layanan;
		filterStatus = data.filters.status;
		filterCari = data.filters.cari;
		filterDari = data.filters.dari;
		filterSampai = data.filters.sampai;
	});

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
				<button class="btn btn-sm btn-danger" onclick={resetFilters}>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					Reset Filter
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
				<a href="/admin/pengajuan/export/csv?{new URLSearchParams($page.url.searchParams).toString()}" class="btn export-btn csv">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 12h8"/><path d="M8 16h8"/></svg>
					Export CSV
				</a>
				<a href="/admin/pengajuan/export/pdf?{new URLSearchParams($page.url.searchParams).toString()}" class="btn export-btn pdf">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13v-3h6v3"/><path d="M9 17v-3h6v3"/></svg>
					Cetak PDF
				</a>
			</div>
			<button class="btn btn-primary" onclick={applyFilters}>
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
								<td><StatusBadge status={sub.status} /></td>
								<td>{sub.assigned_to_name || '-'}</td>
								<td class="date-cell">{formatDate(sub.created_at)}</td>
								<td>
									<a href="/admin/pengajuan/{sub.id}" class="btn btn-sm btn-ghost" style="color: var(--admin-primary);">Detail →</a>
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
	/* Most styles moved to admin.css */
	.code-with-icon { display: flex; align-items: center; gap: 0.4rem; }
	.name-with-badge { display: flex; align-items: center; gap: 0.5rem; }
</style>
