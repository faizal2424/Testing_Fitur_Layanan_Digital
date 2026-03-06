<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';

	const { toasts } = $derived({ toasts: $toast });
</script>

<div class="toast-container">
	{#each toasts as item (item.id)}
		<div
			class="toast-item {item.type}"
			animate:flip={{ duration: 300 }}
			in:fly={{ y: -20, opacity: 0, duration: 300 }}
			out:fade={{ duration: 200 }}
		>
			<div class="toast-icon">
				{#if item.type === 'success'}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				{:else if item.type === 'error'}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				{:else if item.type === 'warning'}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.15 9.17 15.82a2.1 2.1 0 0 1-1.83 3.03H3.83a2.1 2.1 0 0 1-1.83-3.03L11.17 2.15a1 1 0 0 1 1.66 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12.01" y2="16"/><path d="M12 8v4"/></svg>
				{/if}
			</div>
			<div class="toast-message">{item.message}</div>
			<button class="toast-close" onclick={() => toast.remove(item.id)} aria-label="Close notification">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		pointer-events: none;
		max-width: 400px;
		width: calc(100% - 3rem);
	}

	.toast-item {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.05);
		border-left: 4px solid #cbd5e1;
		overflow: hidden;
	}

	.toast-item.success { border-left-color: #10b981; }
	.toast-item.error { border-left-color: #ef4444; }
	.toast-item.warning { border-left-color: #f59e0b; }
	.toast-item.info { border-left-color: #3b82f6; }

	.toast-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.success .toast-icon { color: #10b981; }
	.error .toast-icon { color: #ef4444; }
	.warning .toast-icon { color: #f59e0b; }
	.info .toast-icon { color: #3b82f6; }

	.toast-message {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
		line-height: 1.4;
	}

	.toast-close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: #9ca3af;
		cursor: pointer;
		transition: all 0.2s;
	}

	.toast-close:hover {
		background: #f3f4f6;
		color: #4b5563;
	}
</style>
