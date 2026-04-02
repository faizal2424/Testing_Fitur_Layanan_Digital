<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Filter state
	let searchCari = $state(data.filters.cari);
	let filterPeran = $state(data.filters.peran);


	function applyFilters() {
		const params = new URLSearchParams();
		if (searchCari) params.set('cari', searchCari);
		if (filterPeran) params.set('peran', filterPeran);
		goto(`/admin/pengguna?${params.toString()}`);
	}

	function resetFilters() {
		searchCari = '';
		filterPeran = '';
		goto('/admin/pengguna');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('halaman', p.toString());
		goto(`/admin/pengguna?${params.toString()}`);
	}

	function confirmDelete(id: string, name: string) {
		if (confirm(`Apakah Anda yakin ingin menghapus pengguna "${name}"?`)) {
			return true;
		}
		return false;
	}

	let hasActiveFilter = $derived(!!data.filters.cari || !!data.filters.peran);
</script>

<svelte:head>
	<title>Manajemen Pengguna — Layanan Digital</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div>
			<h2 class="page-title">Manajemen Pengguna</h2>
			<p class="page-desc">Kelola akun administrator dan PIC sistem.</p>
		</div>
		<div class="header-actions">
			<a href="/admin/pengguna/tambah" class="btn btn-primary">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Tambah Pengguna
			</a>
		</div>
	</div>

	{#if form?.message}
		<div class="alert" class:error={!form.success} class:success={form.success}>
			{#if !form.success}
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;"><polyline points="20 6 9 17 4 12"/></svg>
			{/if}
			{form.message}
		</div>
	{/if}

	<!-- Filters -->
	<div class="filters-card">
		<div class="filters-header">
			<h3 class="section-title">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
				</svg>
				Filter & Cari
			</h3>
			{#if hasActiveFilter}
				<button class="reset-btn" onclick={resetFilters}>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
					</svg>
					Reset
				</button>
			{/if}
		</div>
		<div class="filters-grid">
			<div class="filter-group span-2">
				<label for="search-cari">Cari Pengguna</label>
				<input
					type="text"
					id="search-cari"
					placeholder="Nama, email, atau username..."
					bind:value={searchCari}
					onkeydown={(e) => e.key === 'Enter' && applyFilters()}
				/>
			</div>
			<div class="filter-group span-2">
				<label for="filter-peran">Peran</label>
				<select id="filter-peran" bind:value={filterPeran}>
					<option value="">Semua Peran</option>
					{#each data.roles as role}
						<option value={role.name}>{role.name}</option>
					{/each}
				</select>
			</div>
			<div class="filter-group span-1" style="justify-content: flex-end;">
				<button class="filter-apply-btn" onclick={applyFilters}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					Terapkan Filter
				</button>
			</div>
		</div>
	</div>

	<!-- Users Table -->
	<div class="table-card">
		<div class="table-header">
			<h3 class="section-title">Daftar Pengguna</h3>
			<span class="table-count">{data.pagination.total} total akun</span>
		</div>

		{#if data.users.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<line x1="17" y1="8" x2="22" y2="13" /><line x1="22" y1="8" x2="17" y2="13" />
				</svg>
				<p>Tidak ada pengguna ditemukan untuk filter ini.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Nama Lengkap & Email</th>
							<th>Username</th>
							<th>Peran Sistem</th>
							<th>Kontak Telepon</th>
							<th style="text-align: right;">Opsi</th>
						</tr>
					</thead>
					<tbody>
						{#each data.users as user}
							<tr class="user-row">
								<td>
									<div class="user-main-info">
										<span class="user-fullname">{user.name}</span>
										<span class="user-subemail">{user.email}</span>
									</div>
								</td>
								<td><code class="user-code">{user.username}</code></td>
								<td>
									<div class="role-badges-list">
										{#each user.roles as role}
											<span class="role-badge" class:superadmin={role === 'superadmin'} class:admin={role === 'admin'} class:pic={role === 'pic'}>
												{role.toUpperCase()}
											</span>
										{/each}
									</div>
								</td>
								<td>
									{#if user.phone}
										<div class="phone-link">
											<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.21-2.21a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
											{user.phone}
										</div>
									{:else}
										<span class="text-dim">-</span>
									{/if}
								</td>
								<td>
									<div class="actions-group">
										<a href="/admin/pengguna/ubah/{user.id}" class="icon-btn-edit" title="Ubah Pengguna">
											<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
											</svg>
										</a>
										{#if user.id !== data.user.id.toString()}
											<form method="POST" action="?/hapus" use:enhance={() => {
												return ({ result }) => {
													if (result.type === 'success') {
														goto($page.url.pathname + $page.url.search, { invalidateAll: true });
													}
												};
											}}>
												<input type="hidden" name="id" value={user.id} />
												<button
													type="submit"
													class="icon-btn-delete"
													title="Hapus"
													onclick={(e) => !confirmDelete(user.id, user.name) && e.preventDefault()}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
														<polyline points="3 6 5 6 21 6" />
														<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
														<line x1="10" y1="11" x2="10" y2="17" />
														<line x1="14" y1="11" x2="14" y2="17" />
													</svg>
												</button>
											</form>
										{/if}
									</div>
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
	.span-2 { grid-column: span 2; }
	.span-1 { grid-column: span 1; }

	.user-main-info { display: flex; flex-direction: column; gap: 0.15rem; }
	.user-fullname { font-weight: 700; color: var(--admin-text); font-size: 0.95rem; }
	.user-subemail { font-size: 0.75rem; color: var(--admin-text-subtle); }

	.user-code { 
		background: #f8fafc; 
		padding: 0.25rem 0.5rem; 
		border-radius: 6px; 
		font-size: 0.8rem; 
		font-family: inherit; 
		color: var(--admin-text-subtle);
		border: 1px solid #f1f5f9;
	}

	.role-badges-list { display: flex; gap: 0.5rem; flex-wrap: wrap; }
	.role-badge {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.6rem;
		border-radius: 8px;
		text-transform: uppercase;
	}

	.role-badge.superadmin { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; }
	.role-badge.admin      { background: #fdf2f8; color: #800020; border: 1px solid #fbcfe8; }
	.role-badge.pic        { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

	.phone-link {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--admin-text-muted);
	}

	.text-dim { color: var(--admin-text-dim); }

	.actions-group { display: flex; gap: 0.75rem; justify-content: flex-end; align-items: center; }

	.icon-btn-edit, .icon-btn-delete {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		transition: all 0.2s;
		cursor: pointer;
		border: none;
	}

	.icon-btn-edit { background: #f8fafc; color: #64748b; }
	.icon-btn-edit:hover { background: #f1f5f9; color: #800020; }

	.icon-btn-delete { background: #fef2f2; color: #ef4444; }
	.icon-btn-delete:hover { background: #fee2e2; color: #dc2626; }

	@media (max-width: 1024px) {
		.filters-grid { grid-template-columns: 1fr 1fr; }
		.span-2 { grid-column: span 2; }
	}

	@media (max-width: 768px) {
		.filters-grid { grid-template-columns: 1fr; }
		.span-2, .span-1 { grid-column: span 1; }
	}
</style>
