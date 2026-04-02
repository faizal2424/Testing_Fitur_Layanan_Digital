<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import UserForm from '$lib/components/admin/UserForm.svelte';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);

	$effect(() => {
		if (form?.success) {
			toast.success('Pengguna berhasil ditambahkan');
			goto('/admin/pengguna');
		}
	});
</script>

<svelte:head>
	<title>Tambah Pengguna — Layanan Digital</title>
</svelte:head>

<div class="page">
	<nav class="breadcrumb">
		<a href="/admin/pengguna">Manajemen Pengguna</a>
		<span class="separator">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
		</span>
		<span class="current">Tambah Pengguna</span>
	</nav>

	<div class="page-header mb-6">
		<div>
			<h2 class="page-title">Tambah Pengguna Baru</h2>
			<p class="page-desc">Silakan isi formulir di bawah untuk membuat akun baru.</p>
		</div>
	</div>

	{#if form?.message && !form.success}
		<div class="alert error mb-6">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			{form.message}
		</div>
	{/if}

	<div class="max-w-3xl mx-auto">
		<UserForm roles={data.roles} bind:loading />
	</div>
</div>

<style>
    .max-w-3xl { max-width: 800px; }
	.mx-auto { margin-left: auto; margin-right: auto; }
	.mb-6 { margin-bottom: 1.5rem; }
</style>
