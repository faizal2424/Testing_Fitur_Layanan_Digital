<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		opdList: string[];
		onClose: () => void;
	}

	let { opdList, onClose }: Props = $props();
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
	<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-header">
			<h3>Tambah Instansi</h3>
			<button class="modal-close" onclick={onClose} aria-label="Tutup">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<form method="POST" action="?/create_agency" use:enhance={() => {
			return async ({ update }) => { await update({ reset: false }); };
		}}>
			<div class="modal-body">
				<p class="modal-hint">Data ini akan digunakan sebagai kop surat otomatis pada bukti pengajuan layanan instansi.</p>
				<div class="form-group">
					<label for="c-agency-name">Nama Instansi *</label>
					<select id="c-agency-name" name="name" required class="form-control">
						<option value="">— Pilih OPD / Instansi —</option>
						{#each opdList as opd}
							<option value={opd}>{opd}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="c-agency-address">Alamat</label>
					<textarea id="c-agency-address" name="address" rows="2" placeholder="Contoh: Jl. Gatot Subroto No.104 A..."></textarea>
				</div>
				<div class="form-row" style="display: flex; gap: 1rem;">
					<div class="form-group" style="flex: 1;">
						<label for="c-agency-phone">No Telepon</label>
						<input type="text" id="c-agency-phone" name="phone" placeholder="(024) 76901553" />
					</div>
					<div class="form-group" style="flex: 1;">
						<label for="c-agency-email">Email</label>
						<input type="email" id="c-agency-email" name="email" placeholder="kominfo@semarangkab.go.id" />
					</div>
				</div>
				<div class="form-row" style="display: flex; gap: 1rem;">
					<div class="form-group" style="flex: 1;">
						<label for="c-agency-web">Website</label>
						<input type="text" id="c-agency-web" name="website" placeholder="diskominfo.semarangkab.go.id" />
					</div>
					<div class="form-group" style="flex: 1;">
						<label for="c-agency-postal">Kode Pos</label>
						<input type="text" id="c-agency-postal" name="postal_code" placeholder="50517" />
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>Batal</button>
				<button type="submit" class="btn btn-primary">Simpan Instansi</button>
			</div>
		</form>
	</div>
</div>
