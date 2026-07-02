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
	let charts: any[] = [];

	// Rank medal colors
	const rankColors = ['#f59e0b', '#9ca3af', '#cd7c2f', '#6366f1', '#14b8a6'];

	// Trend derived stats
	const trendTotal = data.stats.trends.reduce((s, t) => s + t.count, 0);
	const trendAvg = trendTotal > 0 ? (trendTotal / 30).toFixed(1) : '0';
	const trendPeak = data.stats.trends.reduce(
		(best, t) => (t.count > (best?.count ?? 0) ? t : best),
		data.stats.trends[0] ?? null
	);
	const last7 = data.stats.trends.slice(-7).reduce((s, t) => s + t.count, 0);
	const prev7 = data.stats.trends.slice(-14, -7).reduce((s, t) => s + t.count, 0);
	const trendUp = last7 >= prev7;

	async function initCharts() {
		const { Chart } = await import('chart.js/auto');
		
		// Destroy old charts if they exist (for resizing or re-renders if needed)
		charts.forEach(c => c.destroy());
		charts = [];

		// 1. Trend Chart (Line) — gradient fill
		const trendCtx = trendChartCanvas.getContext('2d')!;
		const grad = trendCtx.createLinearGradient(0, 0, 0, 220);
		grad.addColorStop(0, 'rgba(128,0,32,0.18)');
		grad.addColorStop(1, 'rgba(128,0,32,0.01)');
		charts.push(new Chart(trendChartCanvas, {
			type: 'line',
			data: {
				labels: data.stats.trends.map(t => formatDate(t.date).split(',')[0]),
				datasets: [{
					label: 'Pengajuan',
					data: data.stats.trends.map(t => t.count),
					borderColor: '#800020',
					borderWidth: 2.5,
					backgroundColor: grad,
					fill: true,
					tension: 0.45,
					pointRadius: 3,
					pointBackgroundColor: '#800020',
					pointBorderColor: '#fff',
					pointBorderWidth: 1.5,
					pointHoverRadius: 6
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: '#111827',
						titleColor: '#f9fafb',
						bodyColor: '#d1d5db',
						padding: 10,
						cornerRadius: 8,
						displayColors: false
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: { font: { size: 11 }, color: '#9ca3af', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
					},
					y: {
						beginAtZero: true,
						ticks: { stepSize: 1, font: { size: 11 }, color: '#9ca3af' },
						grid: { color: 'rgba(0,0,0,0.05)' }
					}
				}
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
				maintainAspectRatio: false,
				cutout: '70%',
				plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, font: { size: 11 } } } }
			}
		}));

		// 3. Popularity Chart is now a ranked list (no canvas needed)
		// 4. OPD Chart is now a ranked list (no canvas needed)
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
			<div class="stat-icon blue">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
					<polyline points="21 3 21 8 16 8" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Pengajuan Dalam Proses</span>
				<span class="stat-value">{data.stats.inProgressCount}</span>
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

	<!-- Analytics Grid: Trend + Status -->
	<div class="analytics-grid">
		<div class="chart-card trend-card">
			<div class="trend-header">
				<div class="trend-title-group">
					<div class="trend-icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
					</div>
					<div>
						<h3 class="trend-title">Tren Pengajuan</h3>
						<p class="trend-subtitle">30 hari terakhir · diperbarui hari ini</p>
					</div>
				</div>
				<span class="trend-direction" class:up={trendUp} class:down={!trendUp}>
					{#if trendUp}
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
						Naik
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
						Turun
					{/if}
					<span class="trend-period">7 hari</span>
				</span>
			</div>
			<div class="trend-metrics">
				<div class="trend-metric">
					<span class="tm-value">{trendTotal}</span>
					<span class="tm-label">Total Pengajuan</span>
				</div>
				<div class="trend-metric-divider"></div>
				<div class="trend-metric">
					<span class="tm-value">{trendAvg}</span>
					<span class="tm-label">Rata-rata/Hari</span>
				</div>
				<div class="trend-metric-divider"></div>
				<div class="trend-metric">
					<span class="tm-value">{trendPeak?.count ?? 0}</span>
					<span class="tm-label">Puncak Harian</span>
				</div>
				<div class="trend-metric-divider"></div>
				<div class="trend-metric">
					<span class="tm-value">{last7}</span>
					<span class="tm-label">7 Hari Terakhir</span>
				</div>
			</div>
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
	</div>

	<!-- Ranked Lists: Layanan Terpopuler & OPD Pengaju -->
	<div class="ranked-grid">
		<!-- Layanan Terpopuler -->
		<div class="chart-card ranked-card">
			<div class="ranked-header">
				<div class="ranked-title-group">
					<div class="ranked-icon maroon">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
					</div>
					<div>
						<h3 class="ranked-title">Layanan Terpopuler</h3>
						<p class="ranked-subtitle">Top 5 layanan berdasarkan jumlah pengajuan</p>
					</div>
				</div>
				<span class="ranked-badge maroon">{data.stats.popularity.reduce((s,p)=>s+p.count,0)} total</span>
			</div>
			{#if data.stats.popularity.length === 0}
				<div class="ranked-empty">Belum ada data pengajuan.</div>
			{:else}
				{@const maxPop = data.stats.popularity[0]?.count || 1}
				<ol class="ranked-list">
					{#each data.stats.popularity as item, i}
						<li class="ranked-item">
							<span class="rank-medal" style="background:{rankColors[i]}"></span>
							<div class="rank-info">
								<span class="rank-name">{item.name}</span>
								<div class="rank-bar-wrap">
									<div class="rank-bar maroon" style="width:{Math.round((item.count/maxPop)*100)}%"></div>
								</div>
							</div>
							<span class="rank-count">{item.count}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</div>

		<!-- OPD Pengaju Terbanyak -->
		<div class="chart-card ranked-card">
			<div class="ranked-header">
				<div class="ranked-title-group">
					<div class="ranked-icon teal">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
					</div>
					<div>
						<h3 class="ranked-title">OPD Pengaju Terbanyak</h3>
						<p class="ranked-subtitle">Top 5 OPD asal pengaju berdasarkan jumlah</p>
					</div>
				</div>
				<span class="ranked-badge teal">{data.stats.topOpd.reduce((s,p)=>s+p.count,0)} total</span>
			</div>
			{#if data.stats.topOpd.length === 0}
				<div class="ranked-empty">Belum ada data OPD pengaju.</div>
			{:else}
				{@const maxOpd = data.stats.topOpd[0]?.count || 1}
				<ol class="ranked-list">
					{#each data.stats.topOpd as item, i}
						<li class="ranked-item">
							<span class="rank-medal" style="background:{rankColors[i]}"></span>
							<div class="rank-info">
								<span class="rank-name">{item.name}</span>
								<div class="rank-bar-wrap">
									<div class="rank-bar teal" style="width:{Math.round((item.count/maxOpd)*100)}%"></div>
								</div>
							</div>
							<span class="rank-count">{item.count}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	</div>



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