<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		count?: number | string;
		icon?: Snippet;
		children?: Snippet;
		actions?: Snippet;
		noPadding?: boolean;
		customClass?: string;
	}

	let { 
		title, 
		subtitle, 
		count, 
		icon, 
		children, 
		actions, 
		noPadding = false,
		customClass = ''
	}: Props = $props();
</script>

<div class="card {customClass}" style={noPadding ? 'padding: 0;' : ''}>
	{#if title || subtitle || count || icon || actions}
		<div class="card-header">
			<div class="header-main">
				{#if icon}
					<span class="card-icon">{@render icon()}</span>
				{/if}
				<div class="card-headings">
					{#if title}
						<h3 class="card-title">
							{title}
							{#if count !== undefined}
								<span class="card-count">({count})</span>
							{/if}
						</h3>
					{/if}
					{#if subtitle}
						<p class="card-subtitle">{subtitle}</p>
					{/if}
				</div>
			</div>
			
			{#if actions}
				<div class="card-actions">
					{@render actions()}
				</div>
			{/if}
		</div>
	{/if}

	<div class="card-body">
		{@render children?.()}
	</div>
</div>

<style>
	/* Some specific styles for the reusable Card component 
	   that are not in admin.css yet or need refinement */
	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--admin-border);
	}

	.header-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.card-headings {
		display: flex;
		flex-direction: column;
	}

	.card-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--admin-text);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.card-count {
		font-size: 0.8rem;
		color: var(--admin-text-subtle);
		font-weight: 500;
	}

	.card-subtitle {
		font-size: 0.78rem;
		color: var(--admin-text-subtle);
		margin: 0.15rem 0 0;
	}

	.card-body {
		/* Body padding is handled by the parent .card in admin.css usually,
		   but here we use it to separate from header */
		padding: 1.25rem 1.5rem;
	}

	.card[style*="padding: 0;"] .card-body {
		padding: 0;
	}
</style>
