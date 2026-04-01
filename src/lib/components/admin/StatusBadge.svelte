<script lang="ts">
	import { getStatusLabel, getStatusColor } from '$lib/utils/submissionFlow';

	interface Props {
		status: string;
		customClass?: string;
		size?: 'sm' | 'md';
	}

	let { status, customClass = '', size = 'md' }: Props = $props();
</script>

<span 
	class="status-badge {getStatusColor(status)} {customClass}"
	class:sm={size === 'sm'}
>
	{getStatusLabel(status)}
</span>