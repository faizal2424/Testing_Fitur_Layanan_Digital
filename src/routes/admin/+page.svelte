<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Filter state
	let filterLayanan = $state(data.filters.layanan);
	let filterStatus = $state(data.filters.status);
	let filterDari = $state(data.filters.dari);
	let filterSampai = $state(data.filters.sampai);

	const statusLabels: Record<string, string> = {
		baru: 'Baru',
		ditugaskan: 'Ditugaskan',
		diproses_pic: 'Diproses PIC',
		ditolak_pic: 'Ditolak PIC',
		diselesaikan_pic: 'Diselesaikan PIC',
		disetujui_pic: 'Disetujui PIC',
		ditolak_pengajuan: 'Ditolak',
		selesai: 'Selesai'
	};

	const statusColors: Record<string, string> = {
		baru: 'blue',
		ditugaskan: 'amber',
		diproses_pic: 'indigo',
		ditolak_pic: 'orange',
		diselesaikan_pic: 'teal',
		disetujui_pic: 'cyan',
		ditolak_pengajuan: 'red',
		selesai: 'green'
	};

	function getStatusLabel(status: string): string {
		return statusLabels[status] || status;
	}

	function getStatusColor(status: string): string {
		return statusColors[status] || 'gray';
	}

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
		goto(`/admin?${params.toString()}`);
	}

	function resetFilters() {
		filterLayanan = '';
		filterStatus = '';
		filterDari = '';
		filterSampai = '';
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
					<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">{hasActiveFilter ? 'Hasil Filter' : 'Total Pengajuan'}</span>
				<span class="stat-value">{data.stats.filteredCount}</span>
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
				<button class="reset-btn" onclick={resetFilters}>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
					</svg>
					Reset Filter
				</button>
			{/if}
		</div>
		<div class="filters-grid">
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
			<button class="filter-apply-btn" onclick={applyFilters}>
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
			<h3 class="section-title">Pengajuan Terbaru</h3>
			<span class="table-count">{data.pagination.total} pengajuan</span>
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
									<span class="status-badge {getStatusColor(sub.status)}">
										{getStatusLabel(sub.status)}
									</span>
								</td>
								<td>{sub.assigned_to_name || '-'}</td>
								<td class="date-cell">{formatDate(sub.created_at)}</td>
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
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Welcome Card */
	.welcome-card {
		background: linear-gradient(135deg, #800020, #a80030);
		border-radius: 16px;
		padding: 1.75rem 2rem;
		color: white;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		overflow: hidden;
		position: relative;
	}

	.welcome-content h2 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.3rem;
	}

	.welcome-content p {
		font-size: 0.875rem;
		opacity: 0.85;
		margin: 0;
	}

	.welcome-decoration {
		opacity: 0.1;
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background: white;
		border-radius: 14px;
		padding: 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid #f3f4f6;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.stat-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-icon.blue { background: #eff6ff; color: #2563eb; }
	.stat-icon.green { background: #f0fdf4; color: #16a34a; }
	.stat-icon.amber { background: #fffbeb; color: #d97706; }
	.stat-icon.rose { background: #fff1f2; color: #e11d48; }

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin-top: 0.1rem;
	}

	/* Analytics Grid */
	.analytics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.chart-card {
		background: white;
		border-radius: 14px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		border: 1px solid #f3f4f6;
		display: flex;
		flex-direction: column;
	}

	.chart-card .section-title {
		margin-bottom: 1.5rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		color: #6b7280;
	}

	.chart-body {
		flex: 1;
		min-height: 240px;
		position: relative;
	}

	.trend-card {
		grid-column: span 2;
	}

	.status-card {
		grid-column: span 1;
	}

	.popularity-card {
		grid-column: span 3;
	}

	.popularity-card .chart-body {
		min-height: 200px;
	}

	@media (max-width: 1024px) {
		.analytics-grid {
			grid-template-columns: 1fr;
		}
		.trend-card, .status-card, .popularity-card {
			grid-column: span 1;
		}
	}

	/* Status Overview */
	.status-overview {
		background: white;
		border-radius: 14px;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid #f3f4f6;
	}

	.status-overview .section-title {
		margin-bottom: 0.75rem;
	}

	.status-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.status-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1.5px solid transparent;
		font-family: inherit;
	}

	.status-chip.blue { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
	.status-chip.amber { background: #fffbeb; color: #d97706; border-color: #fde68a; }
	.status-chip.indigo { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }
	.status-chip.orange { background: #fff7ed; color: #ea580c; border-color: #fed7aa; }
	.status-chip.teal { background: #f0fdfa; color: #0d9488; border-color: #99f6e4; }
	.status-chip.cyan { background: #ecfeff; color: #0891b2; border-color: #a5f3fc; }
	.status-chip.green { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
	.status-chip.red { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
	.status-chip.gray { background: #f9fafb; color: #6b7280; border-color: #e5e7eb; }

	.status-chip.active {
		box-shadow: 0 0 0 2px rgba(128, 0, 32, 0.3);
	}

	.status-chip:hover {
		transform: translateY(-1px);
	}

	.chip-count {
		background: rgba(0, 0, 0, 0.08);
		padding: 0.1rem 0.4rem;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	/* Filters Card */
	.filters-card {
		background: white;
		border-radius: 14px;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid #f3f4f6;
	}

	.filters-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
	}

	.reset-btn:hover {
		background: #fee2e2;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.filter-group label {
		font-size: 0.78rem;
		font-weight: 600;
		color: #374151;
	}

	.filter-group select,
	.filter-group input {
		padding: 0.55rem 0.75rem;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		font-size: 0.85rem;
		color: #1f2937;
		background: #f9fafb;
		font-family: inherit;
		transition: all 0.2s;
	}

	.filter-group select:focus,
	.filter-group input:focus {
		outline: none;
		border-color: #800020;
		box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1);
		background: white;
	}

	.filters-actions {
		margin-top: 0.75rem;
		display: flex;
		justify-content: flex-end;
	}

	.filter-apply-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1.25rem;
		background: linear-gradient(135deg, #800020, #a80030);
		color: white;
		border: none;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(128, 0, 32, 0.25);
	}

	.filter-apply-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(128, 0, 32, 0.35);
	}

	/* Table Card */
	.table-card {
		background: white;
		border-radius: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid #f3f4f6;
		overflow: hidden;
	}

	.table-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.table-count {
		font-size: 0.8rem;
		color: #6b7280;
		font-weight: 500;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: #f9fafb;
	}

	th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	td {
		padding: 0.85rem 1rem;
		font-size: 0.85rem;
		color: #374151;
		border-top: 1px solid #f3f4f6;
	}

	tbody tr {
		transition: background 0.15s;
	}

	tbody tr:hover {
		background: #fafafa;
	}

	.tracking-code {
		background: #f3f4f6;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		font-size: 0.78rem;
		font-weight: 600;
		color: #374151;
		letter-spacing: 0.02em;
	}

	.applicant-info {
		display: flex;
		flex-direction: column;
	}

	.applicant-name {
		font-weight: 600;
		color: #111827;
	}

	.applicant-email {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.6rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.status-badge.blue { background: #eff6ff; color: #2563eb; }
	.status-badge.amber { background: #fffbeb; color: #d97706; }
	.status-badge.indigo { background: #eef2ff; color: #4f46e5; }
	.status-badge.orange { background: #fff7ed; color: #ea580c; }
	.status-badge.teal { background: #f0fdfa; color: #0d9488; }
	.status-badge.cyan { background: #ecfeff; color: #0891b2; }
	.status-badge.green { background: #f0fdf4; color: #16a34a; }
	.status-badge.red { background: #fef2f2; color: #dc2626; }
	.status-badge.gray { background: #f9fafb; color: #6b7280; }

	.date-cell {
		white-space: nowrap;
		font-size: 0.8rem;
		color: #6b7280;
	}

	/* Empty State */
	.empty-state {
		padding: 3rem 2rem;
		text-align: center;
		color: #9ca3af;
	}

	.empty-state p {
		margin-top: 0.75rem;
		font-size: 0.9rem;
	}

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

	/* Responsive */
	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.filters-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.filters-grid {
			grid-template-columns: 1fr;
		}

		.welcome-card {
			padding: 1.25rem 1.5rem;
		}

		.welcome-content h2 {
			font-size: 1.1rem;
		}

		.pagination {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>