<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		service: any;
		onClose: () => void;
	}

	let { service, onClose }: Props = $props();
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
	<div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-header">
			<h3>Hapus Layanan</h3>
			<button class="modal-close" onclick={onClose} aria-label="Tutup">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<form method="POST" action="?/delete" use:enhance={() => {
			return async ({ update }) => { await update(); };
		}}>
			<input type="hidden" name="id" value={service.id} />
			<div class="modal-body">
				<p class="confirm-text">
					Apakah Anda yakin ingin menghapus layanan <strong>"{service.name}"</strong>?
				</p>
				{#if service.submissionCount > 0}
					<div class="alert alert-error" style="margin-top: 0.75rem;">
						Layanan ini memiliki {service.submissionCount} pengajuan dan tidak bisa dihapus.
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>Batal</button>
				<button type="submit" class="btn btn-danger" disabled={service.submissionCount > 0}>Hapus</button>
			</div>
		</form>
	</div>
</div>
