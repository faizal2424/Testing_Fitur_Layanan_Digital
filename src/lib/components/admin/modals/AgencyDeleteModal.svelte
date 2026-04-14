<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		agency: any;
		onClose: () => void;
	}

	let { agency, onClose }: Props = $props();
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
	<div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-header">
			<h3>Hapus Instansi</h3>
			<button class="modal-close" onclick={onClose} aria-label="Tutup">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<form method="POST" action="?/delete_agency" use:enhance={() => {
			return async ({ update }) => { await update(); };
		}}>
			<input type="hidden" name="id" value={agency.id} />
			<div class="modal-body">
				<p class="confirm-text">
					Apakah Anda yakin ingin menghapus Instansi <strong>"{agency.name}"</strong>?
				</p>
				<div class="alert alert-error" style="margin-top: 0.75rem;">
					Tindakan ini tidak bisa dibatalkan. Pastikan instansi ini tidak memiliki layanan aktif atau pengguna yang terikat.
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>Batal</button>
				<button type="submit" class="btn btn-danger">Hapus Instansi</button>
			</div>
		</form>
	</div>
</div>
