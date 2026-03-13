<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import UserForm from '$lib/components/admin/UserForm.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);

	$effect(() => {
		if (form?.success) {
			toast.success('Data pengguna berhasil diperbarui');
			goto('/admin/pengguna');
		}
	});
</script>

<svelte:head>
	<title>Ubah Pengguna — Layanan Digital</title>
</svelte:head>

<div class="page">
	<div class="breadcrumb">
		<a href="/admin/pengguna">Manajemen Pengguna</a>
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="separator"><polyline points="9 18 15 12 9 6"/></svg>
		<span class="current">Ubah Pengguna</span>
	</div>

	<h2 class="page-title">Ubah Data Pengguna</h2>

	{#if form?.message && !form.success}
		<div class="alert error">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			{form.message}
		</div>
	{/if}

	<UserForm 
		user={data.editUser} 
		roles={data.roles} 
		isEdit={true} 
		bind:loading 
	/>
</div>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.breadcrumb a {
		font-size: 0.8125rem;
		color: #6b7280;
		text-decoration: none;
		transition: color 0.15s;
		font-weight: 500;
	}

	.breadcrumb a:hover {
		color: #800020;
	}

	.breadcrumb .separator {
		color: #d1d5db;
	}

	.breadcrumb .current {
		font-size: 0.8125rem;
		color: #111827;
		font-weight: 700;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 800;
		color: #111827;
		margin: 0 0 1.5rem;
		letter-spacing: -0.025em;
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

	.alert.error {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}
</style>
