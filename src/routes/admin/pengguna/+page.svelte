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
		<a href="/admin/pengguna/tambah" class="add-btn">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			Tambah Pengguna
		</a>
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
			<div class="filter-group">
				<label for="filter-peran">Peran</label>
				<select id="filter-peran" bind:value={filterPeran}>
					<option value="">Semua Peran</option>
					{#each data.roles as role}
						<option value={role.name}>{role.name}</option>
					{/each}
				</select>
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

	<!-- Users Table -->
	<div class="table-card">
		<div class="table-header">
			<h3 class="section-title">Daftar Pengguna</h3>
			<span class="table-count">{data.pagination.total} total</span>
		</div>

		{#if data.users.length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
				</svg>
				<p>Tidak ada pengguna ditemukan.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Nama & Email</th>
							<th>Username</th>
							<th>Peran</th>
							<th>Telepon</th>
							<th class="actions-head">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each data.users as user}
							<tr>
								<td>
									<div class="user-info">
										<span class="user-name">{user.name}</span>
										<span class="user-email">{user.email}</span>
									</div>
								</td>
								<td><code>{user.username}</code></td>
								<td>
									<div class="role-badges">
										{#each user.roles as role}
											<span class="role-badge" class:superadmin={role === 'superadmin'} class:admin={role === 'admin'} class:pic={role === 'pic'}>
												{role}
											</span>
										{/each}
									</div>
								</td>
								<td>{user.phone || '-'}</td>
								<td>
									<div class="actions">
										<a href="/admin/pengguna/ubah/{user.id}" class="action-btn edit" title="Ubah">
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
													class="action-btn delete"
													title="Hapus"
													onclick={(e) => !confirmDelete(user.id, user.name) && e.preventDefault()}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
	.page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.page-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
	}

	.page-desc {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0.2rem 0 0;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.25rem;
		background: linear-gradient(135deg, #c0002a, #800020);
		color: white;
		text-decoration: none;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: 600;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(128, 0, 32, 0.2);
	}

	.add-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(128, 0, 32, 0.3);
	}

	.alert {
		padding: 1rem 1.25rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		display: flex;
		align-items: center;
	}

	.alert.success {
		background: #f0fdf4;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.alert.error {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	/* Filters */
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

	.section-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.span-2 {
		grid-column: span 2;
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

	.filter-group select, .filter-group input {
		width: 100%;
		padding: 0.55rem 0.75rem;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		font-size: 0.85rem;
		color: #1f2937;
		background: #f9fafb;
		font-family: inherit;
		transition: all 0.2s;
	}

	input:focus, select:focus {
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
		border: 1px solid #f3f4f6;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
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

	tbody tr:hover {
		background: #fafafa;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.user-name {
		font-weight: 600;
		color: #111827;
	}

	.user-email {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	code {
		background: #f3f4f6;
		color: #374151;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		font-size: 0.78rem;
		font-weight: 600;
	}

	.role-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.role-badge {
		padding: 0.2rem 0.6rem;
		border-radius: 20px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.role-badge.superadmin { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
	.role-badge.admin { background: #fff1f2; color: #be123c; border: 1px solid #fda4af; }
	.role-badge.pic { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }


	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.action-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: white;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		border: 1.5px solid #e5e7eb;
	}

	.action-btn.edit:hover {
		background: #f9fafb;
		color: #111827;
		border-color: #d1d5db;
	}

	.action-btn.delete:hover {
		background: #fef2f2;
		color: #ef4444;
		border-color: #fecaca;
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

	.page-num:hover:not(.active) {
		background: #f9fafb;
		border-color: #d1d5db;
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

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
		color: #9ca3af;
	}

	.empty-state p {
		margin-top: 1rem;
		font-size: 0.9rem;
	}

	@media (max-width: 1024px) {
		.filters-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.span-2 {
			grid-column: span 2;
		}
	}

	@media (max-width: 640px) {
		.filters-grid {
			grid-template-columns: 1fr;
		}
		.span-2 {
			grid-column: span 1;
		}
		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.add-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
