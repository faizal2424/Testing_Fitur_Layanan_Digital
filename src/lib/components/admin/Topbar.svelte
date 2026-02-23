<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		user: {
			name: string;
			role: string;
		};
		onToggleSidebar: () => void;
	}

	let { user, onToggleSidebar }: Props = $props();

	function getPageTitle(pathname: string): string {
		if (pathname === '/admin') return 'Dashboard';
		if (pathname.startsWith('/admin/layanan')) return 'Layanan';
		if (pathname.startsWith('/admin/pengajuan')) return 'Pengajuan';
		if (pathname.startsWith('/admin/log-status')) return 'Log Status';
		if (pathname.startsWith('/admin/pengguna')) return 'Pengguna';
		return 'Admin';
	}
</script>

<header class="topbar">
	<div class="topbar-left">
		<button class="menu-toggle" onclick={onToggleSidebar} aria-label="Toggle sidebar">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>
		<h2 class="page-title">{getPageTitle($page.url.pathname)}</h2>
	</div>

	<div class="topbar-right">
		<div class="topbar-user">
			<span class="topbar-user-name">{user.name}</span>
		</div>
	</div>
</header>

<style>
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		height: 64px;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		position: sticky;
		top: 0;
		z-index: 30;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.menu-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: #f3f4f6;
		border-radius: 10px;
		cursor: pointer;
		color: #374151;
		transition: all 0.2s;
	}

	.menu-toggle:hover {
		background: #e5e7eb;
	}

	.page-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.topbar-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.topbar-user-name {
		font-size: 0.85rem;
		font-weight: 500;
		color: #374151;
	}

	@media (max-width: 1024px) {
		.menu-toggle {
			display: flex;
		}

		.topbar {
			padding: 0 1rem;
		}
	}
</style>
