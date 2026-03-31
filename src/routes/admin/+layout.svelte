<script lang="ts">
	// Global admin styles — shared across ALL pages inside /admin
	import '$lib/styles/admin.css';

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
	/* All layout styles moved to admin.css */
</style>
