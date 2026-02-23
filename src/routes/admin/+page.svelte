<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard — Layanan Digital</title>
</svelte:head>

<div class="dashboard">
	<!-- Welcome Card -->
	<div class="welcome-card">
		<div class="welcome-content">
			<h2>Selamat Datang, {data.user.name}! 👋</h2>
			<p>Kelola layanan digital Kabupaten Semarang dari sini.</p>
		</div>
		<div class="welcome-decoration">
			<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" class="welcome-icon">
				<rect x="3" y="3" width="7" height="7" rx="1" />
				<rect x="14" y="3" width="7" height="7" rx="1" />
				<rect x="3" y="14" width="7" height="7" rx="1" />
				<rect x="14" y="14" width="7" height="7" rx="1" />
			</svg>
		</div>
	</div>

	<!-- Placeholder stats -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon blue">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Total Layanan</span>
				<span class="stat-value">—</span>
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
				<span class="stat-value">—</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon amber">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="12 8 12 12 14 14" />
					<circle cx="12" cy="12" r="10" />
				</svg>
			</div>
			<div class="stat-info">
				<span class="stat-label">Menunggu Proses</span>
				<span class="stat-value">—</span>
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
				<span class="stat-value">—</span>
			</div>
		</div>
	</div>

	<div class="coming-soon">
		<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10" />
			<path d="M8 14s1.5 2 4 2 4-2 4-2" />
			<line x1="9" y1="9" x2="9.01" y2="9" />
			<line x1="15" y1="9" x2="15.01" y2="9" />
		</svg>
		<h3>Dashboard Lengkap Segera Hadir</h3>
		<p>Statistik, filter, dan tabel pengajuan terbaru akan tersedia di fase berikutnya.</p>
	</div>
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
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
		margin-bottom: 2rem;
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

	.stat-icon.blue {
		background: #eff6ff;
		color: #2563eb;
	}
	.stat-icon.green {
		background: #f0fdf4;
		color: #16a34a;
	}
	.stat-icon.amber {
		background: #fffbeb;
		color: #d97706;
	}
	.stat-icon.rose {
		background: #fff1f2;
		color: #e11d48;
	}

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

	/* Coming Soon */
	.coming-soon {
		text-align: center;
		padding: 3rem 2rem;
		background: white;
		border-radius: 16px;
		border: 2px dashed #e5e7eb;
		color: #9ca3af;
	}

	.coming-soon h3 {
		font-size: 1.1rem;
		color: #374151;
		margin: 1rem 0 0.3rem;
	}

	.coming-soon p {
		font-size: 0.875rem;
		margin: 0;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.welcome-card {
			padding: 1.25rem 1.5rem;
		}

		.welcome-content h2 {
			font-size: 1.1rem;
		}
	}
</style>
