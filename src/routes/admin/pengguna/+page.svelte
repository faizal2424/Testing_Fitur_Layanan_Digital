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

<div class="user-management">
	<div class="header-section">
		<div>
			<h2 class="page-title">Manajemen Pengguna</h2>
			<p class="page-subtitle">Kelola akun administrator dan PIC sistem.</p>
		</div>
		<a href="/admin/pengguna/tambah" class="add-btn">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			Tambah Pengguna
		</a>
	</div>

	{#if form?.message}
		<div class="alert" class:error={!form.success} class:success={form.success}>
			{form.message}
		</div>
	{/if}

	<!-- Filters -->
	<div class="filters-card">
		<div class="filters-grid">
			<div class="filter-group search">
				<label for="search-cari">Cari Pengguna</label>
				<div class="search-input-wrapper">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
						<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						type="text"
						id="search-cari"
						placeholder="Nama, email, atau username..."
						bind:value={searchCari}
						onkeydown={(e) => e.key === 'Enter' && applyFilters()}
					/>
				</div>
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
			<div class="filter-actions-inline">
				<button class="apply-btn" onclick={applyFilters}>Filter</button>
				{#if hasActiveFilter}
					<button class="reset-btn" onclick={resetFilters}>Reset</button>
				{/if}
			</div>
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
								<td>{user.phone}</td>
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
	.user-management {
		max-width: 1200px;
		margin: 0 auto;
		font-family: 'Inter', system-ui, sans-serif;
	}

	.header-section {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 2.5rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem;
		letter-spacing: -0.02em;
	}

	.page-subtitle {
		font-size: 0.95rem;
		color: #6b7280;
		margin: 0;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #111827;
		color: white;
		text-decoration: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.add-btn:hover {
		background: #1f2937;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.alert {
		padding: 1rem 1.25rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		font-size: 0.875rem;
		font-weight: 500;
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
		margin-bottom: 2rem;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: minmax(200px, 1fr) 200px auto;
		gap: 1rem;
		align-items: flex-end;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-group label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #4b5563;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 0.875rem;
		color: #9ca3af;
		pointer-events: none;
	}

	.search-input-wrapper input, .filter-group select {
		width: 100%;
		padding: 0.625rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.875rem;
		background: white;
		color: #111827;
		transition: all 0.2s ease;
	}

	.search-input-wrapper input {
		padding-left: 2.5rem;
	}

	input:focus, select:focus {
		outline: none;
		border-color: #6b7280;
		box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
	}

	.filter-actions-inline {
		display: flex;
		gap: 0.5rem;
	}

	.apply-btn {
		padding: 0.625rem 1.25rem;
		background: white;
		color: #374151;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.apply-btn:hover {
		background: #f9fafb;
		border-color: #d1d5db;
	}

	.reset-btn {
		padding: 0.625rem 1rem;
		background: transparent;
		color: #6b7280;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.2s;
	}
	
	.reset-btn:hover {
		color: #ef4444;
		background: #fef2f2;
	}

	/* Table Card */
	.table-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		overflow: hidden;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
	}

	.table-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.table-count {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		background: white;
		padding: 0.25rem 0.6rem;
		border-radius: 99px;
		border: 1px solid #e5e7eb;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		padding: 1rem 1.5rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid #e5e7eb;
	}

	td {
		padding: 1rem 1.5rem;
		font-size: 0.875rem;
		color: #374151;
		border-bottom: 1px solid #f3f4f6;
		vertical-align: middle;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tr:hover td {
		background: #fdfdfd;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.user-name {
		font-weight: 600;
		color: #111827;
	}

	.user-email {
		font-size: 0.8rem;
		color: #6b7280;
	}

	code {
		background: #f3f4f6;
		color: #4b5563;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.role-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.role-badge {
		padding: 0.2rem 0.6rem;
		border-radius: 99px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.role-badge.superadmin { background: #fee2e2; color: #991b1b; }
	.role-badge.admin { background: #fef3c7; color: #92400e; }
	.role-badge.pic { background: #dcfce7; color: #166534; }


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
		border-radius: 6px;
		background: transparent;
		color: #9ca3af;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		border: none;
	}

	.action-btn.edit:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.action-btn.delete:hover {
		background: #fef2f2;
		color: #ef4444;
	}

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.page-btn {
		padding: 0.5rem 0.75rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.page-btn:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-numbers {
		display: flex;
		gap: 0.25rem;
	}

	.page-num {
		min-width: 32px;
		height: 32px;
		padding: 0 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: none;
		background: transparent;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-num:hover:not(.active) {
		background: #f3f4f6;
		color: #111827;
	}

	.page-num.active {
		background: #111827;
		color: white;
		font-weight: 600;
	}

	.page-dots {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		color: #6b7280;
	}

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
		color: #6b7280;
	}

	.empty-state p {
		margin-top: 1rem;
		font-size: 0.9375rem;
	}

	@media (max-width: 768px) {
		.filters-grid {
			grid-template-columns: 1fr;
		}
		.header-section {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
		}
		.add-btn {
			width: 100%;
			justify-content: center;
		}
		.table-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
