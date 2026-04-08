<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { statusLabels, getStatusLabel, getStatusColor } from '$lib/utils/submissionFlow';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';

	let { data }: { data: PageData } = $props();

	// Filter state
	let filterLayanan = $state(data.filters.layanan);
	let filterStatus = $state(data.filters.status);
	let filterDari = $state(data.filters.dari);
	let filterSampai = $state(data.filters.sampai);
	let filterSearch = $state(data.filters.q || '');

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (filterLayanan) params.set('layanan', filterLayanan);
		if (filterStatus) params.set('status', filterStatus);
		if (filterDari) params.set('dari', filterDari);
		if (filterSampai) params.set('sampai', filterSampai);
		if (filterSearch) params.set('q', filterSearch);
		goto(`/admin?${params.toString()}`);
	}

	function resetFilters() {
		filterLayanan = '';
		filterStatus = '';
		filterDari = '';
		filterSampai = '';
		filterSearch = '';
		goto('/admin');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('halaman', p.toString());
		goto(`/admin?${params.toString()}`);
	}

	// Analytics Chart variables
	let trendChartCanvas: HTMLCanvasElement;
	let statusChartCanvas: HTMLCanvasElement;
	let popularityChartCanvas: HTMLCanvasElement;
	let charts: any[] = [];

	async function initCharts() {
		const { Chart } = await import('chart.js/auto');
		
		// Destroy old charts if they exist (for resizing or re-renders if needed)
		charts.forEach(c => c.destroy());
		charts = [];

		// 1. Trend Chart (Line)
		charts.push(new Chart(trendChartCanvas, {
			type: 'line',
			data: {
				labels: data.stats.trends.map(t => formatDate(t.date).split(',')[0]),
				datasets: [{
					label: 'Jumlah Pengajuan',
					data: data.stats.trends.map(t => t.count),
					borderColor: '#800020',
					backgroundColor: 'rgba(128, 0, 32, 0.1)',
					fill: true,
					tension: 0.4
				}]
			},
			options: {
				responsive: true,
				plugins: { legend: { display: false } },
				scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
			}
		}));

		// 2. Status Chart (Doughnut)
		const statusData = Object.entries(data.stats.statusMap);
		const bgColors: Record<string, string> = {
			baru: '#3b82f6',
			ditugaskan: '#f59e0b',
			diproses_pic: '#6366f1',
			ditolak_pic: '#f97316',
			diselesaikan_pic: '#14b8a6',
			selesai: '#22c55e'
		};

		charts.push(new Chart(statusChartCanvas, {
			type: 'doughnut',
			data: {
				labels: statusData.map(([s]) => getStatusLabel(s)),
				datasets: [{
					data: statusData.map(([, c]) => c as number),
					backgroundColor: statusData.map(([s]) => bgColors[s] || '#cbd5e1'),
					borderWidth: 0
				}]
			},
			options: {
				responsive: true,
				cutout: '70%',
				plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, font: { size: 11 } } } }
			}
		}));

		// 3. Popularity Chart (Bar)
		charts.push(new Chart(popularityChartCanvas, {
			type: 'bar',
			data: {
				labels: data.stats.popularity.map(p => p.name),
				datasets: [{
					label: 'Jumlah Pengajuan',
					data: data.stats.popularity.map(p => p.count),
					backgroundColor: '#800020',
					borderRadius: 6
				}]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				plugins: { legend: { display: false } },
				scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
			}
		}));
	}

	onMount(() => {
		initCharts();
	});

	// Check if any filter is active
	let hasActiveFilter = $derived(
		!!data.filters.layanan || !!data.filters.status || !!data.filters.dari || !!data.filters.sampai
	);
</script>

<svelte:head>
	<title>Dashboard — Layanan Digital</title>
</svelte:head>

<div class="dashboard">
	<!-- Welcome Card -->
	<div class="welcome-card">
		<div class="welcome-content">
			<h2>Selamat Datang, {data.user.name}! 👋</h2>
			<p>Kelola layanan digital Kabupaten Semarang dari panel ini.</p>
		</div>
		<div class="welcome-decoration">
			<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="7" height="7" rx="1" />
				<rect x="14" y="3" width="7" height="7" rx="1" />
				<rect x="3" y="14" width="7" height="7" rx="1" />
				<rect x="14" y="14" width="7" height="7" rx="1" />
			</svg>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon blue">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Total Layanan</span>
				<span class="stat-value">{data.stats.totalServices}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon green">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Total Pengajuan</span>
				<span class="stat-value">{data.stats.totalSubmissions}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon amber">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Pengajuan Selesai</span>
				<span class="stat-value">{data.stats.statusMap['selesai'] ?? 0}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon rose">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Pengajuan Hari Ini</span>
				<span class="stat-value">{data.stats.todayCount}</span>
			</div>
		</div>
	</div>

	<!-- Analytics Grid -->
	<div class="analytics-grid">
		<div class="chart-card trend-card">
			<h3 class="section-title">Tren Pengajuan (30 Hari Terakhir)</h3>
			<div class="chart-body">
				<canvas bind:this={trendChartCanvas}></canvas>
			</div>
		</div>
		<div class="chart-card status-card">
			<h3 class="section-title">Distribusi Status</h3>
			<div class="chart-body doughnut">
				<canvas bind:this={statusChartCanvas}></canvas>
			</div>
		</div>
		<div class="chart-card popularity-card">
			<h3 class="section-title">Layanan Terpopuler</h3>
			<div class="chart-body">
				<canvas bind:this={popularityChartCanvas}></canvas>
			</div>
		</div>
	</div>

	<!-- Status Overview -->
	{#if Object.keys(data.stats.statusMap).length > 0}
		<div class="status-overview">
			<h3 class="section-title">Ringkasan Status</h3>
			<div class="status-chips">
				{#each Object.entries(data.stats.statusMap) as [status, count]}
					<button
						class="status-chip {getStatusColor(status)}"
						class:active={filterStatus === status}
						onclick={() => { filterStatus = status; applyFilters(); }}
					>
						<span class="chip-label">{getStatusLabel(status)}</span>
						<span class="chip-count">{count}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Filters -->
	<div class="filters-card">
		<div class="filters-header">
			<h3 class="section-title">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
				</svg>
				Filter Pengajuan
			</h3>
			{#if hasActiveFilter}
				<button class="btn btn-sm btn-danger" onclick={resetFilters}>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
					</svg>
					Reset Filter
				</button>
			{/if}
		</div>
		<div class="filters-grid">
			<div class="filter-group">
				<label for="filter-search">Cari Pengajuan</label>
				<input 
					type="text" 
					id="filter-search" 
					placeholder="Nama, Email, atau Kode..." 
					bind:value={filterSearch}
					onkeydown={(e) => e.key === 'Enter' && applyFilters()}
				/>
			</div>
			<div class="filter-group">
				<label for="filter-layanan">Jenis Layanan</label>
				<select id="filter-layanan" bind:value={filterLayanan}>
					<option value="">Semua Layanan</option>
					{#each data.services as service}
						<option value={service.id}>{service.name}</option>
					{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="filter-status">Status</label>
				<select id="filter-status" bind:value={filterStatus}>
					<option value="">Semua Status</option>
					{#each Object.entries(statusLabels) as [value, label]}
						<option {value}>{label}</option>
					{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="filter-dari">Dari Tanggal</label>
				<input type="date" id="filter-dari" bind:value={filterDari} />
			</div>
			<div class="filter-group">
				<label for="filter-sampai">Sampai Tanggal</label>
				<input type="date" id="filter-sampai" bind:value={filterSampai} />
			</div>
		</div>
		<div class="filters-actions">
			<button class="btn btn-primary" onclick={applyFilters}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				Terapkan Filter
			</button>
		</div>
	</div>

	<!-- Submissions Table -->
	<div class="table-card">
		<div class="table-header">
			<div class="table-header-left">
				<h3 class="section-title">Pengajuan Terbaru</h3>
				<span class="table-count">{data.pagination.total} pengajuan</span>
			</div>
			<div class="table-actions">
				<a 
					href="/admin/pengajuan/export/csv?{$page.url.searchParams.toString()}" 
					class="btn export-btn csv"
					download
					data-sveltekit-reload
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
						<polyline points="14 2 14 8 20 8"></polyline>
						<line x1="8" y1="13" x2="16" y2="13"></line>
						<line x1="8" y1="17" x2="16" y2="17"></line>
						<line x1="10" y1="9" x2="8" y2="9"></line>
					</svg>
					Ekspor CSV
				</a>
				<a 
					href="/admin/pengajuan/export/pdf?{$page.url.searchParams.toString()}" 
					class="btn export-btn pdf"
					target="_blank"
					data-sveltekit-reload
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
						<polyline points="14 2 14 8 20 8"></polyline>
						<path d="M16 13H8"></path>
						<path d="M16 17H8"></path>
						<path d="M10 9H8"></path>
					</svg>
					Cetak PDF
				</a>
			</div>
		</div>

		{#if data.submissions.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
				<p>Belum ada pengajuan{hasActiveFilter ? ' yang sesuai filter' : ''}.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Kode Tracking</th>
							<th>Nama Pemohon</th>
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
									<code class="tracking-code">{sub.tracking_code}</code>
								</td>
								<td>
									<div class="applicant-info">
										<span class="applicant-name">{sub.applicant_name}</span>
										<span class="applicant-email">{sub.applicant_email}</span>
									</div>
								</td>
								<td>{sub.service_name}</td>
								<td>
									<StatusBadge status={sub.status} />
								</td>
								<td>{sub.assigned_to_name || '-'}</td>
								<td class="date-cell">{formatDate(sub.created_at)}</td>
								<td>
									<a href="/admin/pengajuan/{sub.id}" class="btn-detail">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
										Detail
									</a>
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
	/* All styles moved to admin.css */
</style>