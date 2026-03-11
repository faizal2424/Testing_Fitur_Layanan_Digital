<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	interface Props {
		user: {
			name: string;
			role: string;
		};
		onToggleSidebar: () => void;
	}

	let { user, onToggleSidebar }: Props = $props();
	
	let notifications: any[] = $state([]);
	let showNotifications = $state(false);
	let pollInterval: any;

	const unreadCount = $derived(notifications.filter(n => !n.is_read).length);

	async function fetchNotifications() {
		try {
			const res = await fetch('/api/notifications');
			const data = await res.json();
			notifications = data.notifications || [];
		} catch (err) {
			console.error('Failed to fetch notifications:', err);
		}
	}

	async function markAsRead(id?: string, all = false) {
		try {
			await fetch('/api/notifications', {
				method: 'POST',
				body: JSON.stringify({ id, all })
			});
			if (all) {
				notifications = notifications.map(n => ({ ...n, is_read: true }));
			} else {
				notifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
			}
		} catch (err) {
			console.error('Failed to mark notification as read:', err);
		}
	}

	function getPageTitle(pathname: string): string {
		if (pathname === '/admin') return 'Dashboard';
		if (pathname.startsWith('/admin/layanan')) return 'Layanan';
		if (pathname.startsWith('/admin/pengajuan')) return 'Pengajuan';
		if (pathname.startsWith('/admin/log-status')) return 'Log Status';
		if (pathname.startsWith('/admin/pengguna')) return 'Pengguna';
		return 'Admin';
	}

	onMount(() => {
		fetchNotifications();
		pollInterval = setInterval(fetchNotifications, 30000); // Poll every 30s
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	// Close dropdown when clicking outside
	function handleOutsideClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (showNotifications && !target.closest('.notifications-container')) {
			showNotifications = false;
		}
	}
</script>

<svelte:window onclick={handleOutsideClick} />

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
		<div class="notifications-container">
			<button 
				class="notif-btn" 
				onclick={() => showNotifications = !showNotifications}
				aria-label="Notifications"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
				{#if unreadCount > 0}
					<span class="badge" in:fade>{unreadCount > 9 ? '9+' : unreadCount}</span>
				{/if}
			</button>

			{#if showNotifications}
				<div class="notif-dropdown" in:slide={{ duration: 200 }}>
					<div class="notif-header">
						<span>Notifikasi</span>
						{#if unreadCount > 0}
							<button class="mark-all" onclick={() => markAsRead(undefined, true)}>Tandai semua dibaca</button>
						{/if}
					</div>
					<div class="notif-list">
						{#if notifications.length === 0}
							<div class="notif-empty">Tidak ada notifikasi</div>
						{:else}
							{#each notifications as notif}
								<a 
									href={notif.link || '#'} 
									class="notif-item {notif.type} {notif.is_read ? 'read' : 'unread'}"
									onclick={() => !notif.is_read && markAsRead(notif.id)}
								>
									<div class="notif-title">{notif.title}</div>
									<div class="notif-msg">{notif.message}</div>
									<div class="notif-time">
										{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</div>
								</a>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>

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
		gap: 1.25rem;
	}

	.notifications-container {
		position: relative;
	}

	.notif-btn {
		position: relative;
		background: none;
		border: none;
		color: #6b7280;
		padding: 8px;
		cursor: pointer;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.notif-btn:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.badge {
		position: absolute;
		top: -2px;
		right: -2px;
		background: #ef4444;
		color: white;
		font-size: 0.6rem;
		font-weight: 700;
		padding: 1px 4px;
		border-radius: 20px;
		border: 1.5px solid white;
		min-width: 16px;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.notif-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		width: 320px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.notif-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid #f3f4f6;
		background: #f9fafb;
	}

	.notif-header span {
		font-weight: 600;
		color: #111827;
		font-size: 0.9rem;
	}

	.mark-all {
		background: none;
		border: none;
		color: #3b82f6;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0;
	}

	.mark-all:hover {
		text-decoration: underline;
	}

	.notif-list {
		max-height: 400px;
		overflow-y: auto;
	}

	.notif-item {
		display: block;
		padding: 1rem;
		text-decoration: none;
		border-bottom: 1px solid #f3f4f6;
		transition: all 0.2s;
	}

	.notif-item.unread {
		background: #f0f9ff;
		border-left: 3px solid #3b82f6;
	}

	.notif-item.read {
		background: white;
		opacity: 0.7;
	}

	.notif-item:hover {
		background: #f9fafb;
		opacity: 1;
	}

	.notif-item:last-child {
		border-bottom: none;
	}

	.notif-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.notif-msg {
		font-size: 0.8rem;
		color: #6b7280;
		line-height: 1.4;
		margin-bottom: 0.25rem;
	}

	.notif-time {
		font-size: 0.7rem;
		color: #9ca3af;
	}

	.notif-empty {
		padding: 2rem 1rem;
		text-align: center;
		color: #9ca3af;
		font-size: 0.85rem;
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
