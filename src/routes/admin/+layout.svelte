<script lang="ts">
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/admin/Sidebar.svelte';
	import Topbar from '$lib/components/admin/Topbar.svelte';
	import Toast from '$lib/components/admin/Toast.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let sidebarOpen = $state(false);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="admin-layout">
	<!-- Overlay for mobile sidebar -->
	{#if sidebarOpen}
		<div class="sidebar-overlay" onclick={closeSidebar} role="presentation"></div>
	{/if}

	<Toast />

	<!-- Sidebar -->
	<aside class="sidebar" class:open={sidebarOpen}>
		<Sidebar user={data.user} onClose={closeSidebar} />
	</aside>

	<!-- Main Content -->
	<div class="main-area">
		<Topbar user={data.user} onToggleSidebar={toggleSidebar} />
		<main class="main-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow-x: hidden;
	}

	.admin-layout {
		font-family: 'Inter', system-ui, -apple-system, sans-serif;
		display: flex;
		min-height: 100vh;
		background: #f3f4f6;
	}

	/* Sidebar */
	.sidebar {
		width: 270px;
		flex-shrink: 0;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 50;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.sidebar-overlay {
		display: none;
	}

	/* Main Area */
	.main-area {
		flex: 1;
		margin-left: 270px;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.main-content {
		flex: 1;
		padding: 1.5rem;
	}

	/* Mobile responsive */
	@media (max-width: 1024px) {
		.sidebar {
			transform: translateX(-100%);
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.sidebar-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 40;
			backdrop-filter: blur(2px);
		}

		.main-area {
			margin-left: 0;
		}
	}
</style>
