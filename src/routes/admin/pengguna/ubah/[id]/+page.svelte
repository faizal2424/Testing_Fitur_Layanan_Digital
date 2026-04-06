<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { slide } from 'svelte/transition';
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
	<nav class="breadcrumb">
		<a href="/admin/pengguna">Manajemen Pengguna</a>
		<span class="separator">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
		</span>
		<span class="current">Ubah Pengguna</span>
	</nav>

	<div class="page-header mb-6">
		<div>
			<h2 class="page-title">Ubah Data Pengguna</h2>
			<p class="page-desc">Perbarui informasi akun administrator atau PIC di bawah ini.</p>
		</div>
	</div>

	{#if form?.message && !form.success}
		<div class="alert error mb-6" transition:slide={{ duration: 300, axis: 'y' }}>
			<div class="alert-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</div>
			<div class="alert-content">
				{form.message}
			</div>
		</div>
	{/if}

	<div class="max-w-3xl mx-auto">
		<UserForm 
			user={data.editUser} 
			roles={data.roles} 
			agencies={data.agencies}
			isSuper={data.isSuper}
			isEdit={true} 
			bind:loading 
		/>
	</div>
</div>

<style>
    .max-w-3xl { max-width: 800px; }
	.mx-auto { margin-left: auto; margin-right: auto; }
	.mb-6 { margin-bottom: 1.5rem; }
</style>
