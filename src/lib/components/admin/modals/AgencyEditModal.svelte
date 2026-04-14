<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		agency: any;
		opdList: string[];
		onClose: () => void;
	}

	let { agency, opdList, onClose }: Props = $props();
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
	<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-header">
			<h3>Edit Profil Instansi</h3>
			<button class="modal-close" onclick={onClose} aria-label="Tutup">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<form method="POST" action="?/update_agency" use:enhance={() => {
			return async ({ update }) => { await update({ reset: false }); };
		}}>
			<input type="hidden" name="id" value={agency.id} />
			<div class="modal-body">
				<p class="modal-hint">Data ini digunakan sebagai kop surat otomatis pada bukti pengajuan layanan.</p>
				<div class="form-group">
					<label for="u-agency-name">Nama Instansi *</label>
					<select id="u-agency-name" name="name" required class="form-control" value={agency.name}>
						<option value="">— Pilih OPD / Instansi —</option>
						{#each opdList as opd}
							<option value={opd}>{opd}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="u-agency-address">Alamat</label>
					<textarea id="u-agency-address" name="address" rows="2">{agency.address || ''}</textarea>
				</div>
				<div class="form-row" style="display: flex; gap: 1rem;">
					<div class="form-group" style="flex: 1;">
						<label for="u-agency-phone">No Telepon</label>
						<input type="text" id="u-agency-phone" name="phone" value={agency.phone || ''} />
					</div>
					<div class="form-group" style="flex: 1;">
						<label for="u-agency-email">Email</label>
						<input type="email" id="u-agency-email" name="email" value={agency.email || ''} />
					</div>
				</div>
				<div class="form-row" style="display: flex; gap: 1rem;">
					<div class="form-group" style="flex: 1;">
						<label for="u-agency-web">Website</label>
						<input type="text" id="u-agency-web" name="website" value={agency.website || ''} />
					</div>
					<div class="form-group" style="flex: 1;">
						<label for="u-agency-postal">Kode Pos</label>
						<input type="text" id="u-agency-postal" name="postal_code" value={agency.postal_code || ''} />
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>Batal</button>
				<button type="submit" class="btn btn-primary">Simpan Profil</button>
			</div>
		</form>
	</div>
</div>
