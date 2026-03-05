<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import UserForm from '$lib/components/admin/UserForm.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);

	onMount(() => {
		if (form?.success) {
			goto('/admin/pengguna');
		}
	});
</script>

<svelte:head>
	<title>Tambah Pengguna — Layanan Digital</title>
</svelte:head>

<div class="add-user-page">
	<div class="breadcrumb">
		<a href="/admin/pengguna">Manajemen Pengguna</a>
		<span class="separator">/</span>
		<span class="current">Tambah Pengguna</span>
	</div>

	<h2 class="page-title">Tambah Pengguna Baru</h2>

	{#if form?.message}
		<div class="alert" class:error={!form.success} class:success={form.success}>
			{#if form.success}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			{/if}
			{form.message}
		</div>
	{/if}

	<UserForm roles={data.roles} bind:loading />
</div>

<style>
	.add-user-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		margin-bottom: 0.75rem;
	}

	.breadcrumb a {
		color: #6b7280;
		text-decoration: none;
		transition: color 0.15s;
	}

	.breadcrumb a:hover {
		color: #800020;
	}

	.breadcrumb .separator {
		color: #d1d5db;
	}

	.breadcrumb .current {
		color: #374151;
		font-weight: 600;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 800;
		color: #111827;
		margin: 0 0 1.5rem;
	}

	.alert {
		padding: 1rem 1.25rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.75rem;
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
</style>
