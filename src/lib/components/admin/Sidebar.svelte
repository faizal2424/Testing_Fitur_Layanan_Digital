<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		user: {
			id: string;
			name: string;
			username: string;
			email: string;
			role: string;
		};
		onClose: () => void;
	}

	let { user, onClose }: Props = $props();

	// Define menu items based on role
	const allMenuItems = [
		{
			label: 'Dashboard',
			href: '/admin',
			icon: 'dashboard',
			roles: ['superadmin', 'admin']
		},
		{
			label: 'Layanan',
			href: '/admin/layanan',
			icon: 'services',
			roles: ['superadmin', 'admin']
		},
		{
			label: 'Pengajuan',
			href: '/admin/pengajuan',
			icon: 'submissions',
			roles: ['superadmin', 'admin', 'pic']
		},
		{
			label: 'Log Status',
			href: '/admin/log-status',
			icon: 'logs',
			roles: ['superadmin', 'admin', 'pic']
		},
		{
			label: 'Pengguna',
			href: '/admin/pengguna',
			icon: 'users',
			roles: ['superadmin', 'admin']
		}
	];

	let menuItems = $derived(allMenuItems.filter((item) => item.roles.includes(user.role)));

	function isActive(href: string, currentPath: string): boolean {
		if (href === '/admin') {
			return currentPath === '/admin';
		}
		return currentPath.startsWith(href);
	}

	function getRoleBadge(role: string): string {
		switch (role) {
			case 'superadmin':
				return 'Super Admin';
			case 'admin':
				return 'Admin';
			case 'pic':
				return 'PIC';
			default:
				return role;
		}
	}

	async function handleLogout() {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/api/auth/logout';
		document.body.appendChild(form);
		form.submit();
	}
</script>

<div class="sidebar-inner">
	<!-- Header / Brand -->
	<div class="sidebar-header">
		<div class="brand">
			<div class="brand-icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 21h18" />
					<path d="M5 21V7l8-4v18" />
					<path d="M19 21V11l-6-4" />
					<path d="M9 9v.01" />
					<path d="M9 12v.01" />
					<path d="M9 15v.01" />
					<path d="M9 18v.01" />
				</svg>
			</div>
			<div class="brand-text">
				<h1>Layanan Digital</h1>
				<p>Kab. Semarang</p>
			</div>
		</div>

		<!-- Close button (mobile) -->
		<button class="close-btn" onclick={onClose} aria-label="Tutup sidebar">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	</div>

	<!-- Navigation -->
	<nav class="sidebar-nav">
		<ul>
			{#each menuItems as item}
				<li>
					<a
						href={item.href}
						class="nav-link"
						class:active={isActive(item.href, $page.url.pathname)}
						onclick={onClose}
					>
						<span class="nav-icon">
							{#if item.icon === 'dashboard'}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<rect x="3" y="3" width="7" height="7" rx="1" />
									<rect x="14" y="3" width="7" height="7" rx="1" />
									<rect x="3" y="14" width="7" height="7" rx="1" />
									<rect x="14" y="14" width="7" height="7" rx="1" />
								</svg>
							{:else if item.icon === 'services'}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
								</svg>
							{:else if item.icon === 'submissions'}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
									<line x1="16" y1="13" x2="8" y2="13" />
									<line x1="16" y1="17" x2="8" y2="17" />
									<polyline points="10 9 9 9 8 9" />
								</svg>
							{:else if item.icon === 'logs'}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="12 8 12 12 14 14" />
									<circle cx="12" cy="12" r="10" />
								</svg>
							{:else if item.icon === 'users'}
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
									<circle cx="9" cy="7" r="4" />
									<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
									<path d="M16 3.13a4 4 0 0 1 0 7.75" />
								</svg>
							{/if}
						</span>
						<span class="nav-label">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Footer / User Info -->
	<div class="sidebar-footer">
		<div class="user-info">
			<div class="user-avatar">
				{user.name.charAt(0).toUpperCase()}
			</div>
			<div class="user-details">
				<span class="user-name">{user.name}</span>
				<span class="user-email">{user.email}</span>
			</div>
		</div>
		<div class="user-role-badge">
			{getRoleBadge(user.role)}
		</div>
		<button class="logout-btn" onclick={handleLogout}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<polyline points="16 17 21 12 16 7" />
				<line x1="21" y1="12" x2="9" y2="12" />
			</svg>
			<span>Keluar</span>
		</button>
	</div>
</div>

<style>
	.sidebar-inner {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: linear-gradient(180deg, #5c0a15 0%, #800020 40%, #6b0f2e 100%);
		color: white;
		overflow-y: auto;
	}

	/* Header */
	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.25rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.brand-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		flex-shrink: 0;
	}

	.brand-text h1 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.01em;
		line-height: 1.3;
	}

	.brand-text p {
		font-size: 0.7rem;
		margin: 0;
		opacity: 0.7;
		font-weight: 400;
	}

	.close-btn {
		display: none;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		color: white;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		padding: 0.75rem 0;
		overflow-y: auto;
	}

	.sidebar-nav ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 1.25rem;
		color: rgba(255, 255, 255, 0.75);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		border-left: 3px solid transparent;
		margin: 0 0.5rem;
		border-radius: 8px;
	}

	.nav-link:hover {
		color: white;
		background: rgba(255, 255, 255, 0.1);
	}

	.nav-link.active {
		color: white;
		background: rgba(255, 255, 255, 0.15);
		font-weight: 600;
		border-left-color: #fbbf24;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		opacity: 0.85;
	}

	.nav-link.active .nav-icon {
		opacity: 1;
	}

	/* Footer */
	.sidebar-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.15);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 0.6rem;
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.user-name {
		font-size: 0.825rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-email {
		font-size: 0.7rem;
		opacity: 0.6;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-role-badge {
		display: inline-block;
		padding: 0.2rem 0.6rem;
		background: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
		border-radius: 6px;
		font-size: 0.7rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.6rem 0.75rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.85);
		border-radius: 8px;
		font-size: 0.825rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.logout-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		border-color: rgba(239, 68, 68, 0.4);
		color: white;
	}

	/* Mobile */
	@media (max-width: 1024px) {
		.close-btn {
			display: flex;
		}
	}
</style>
