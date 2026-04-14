<script lang="ts">
	import { enhance } from '$app/forms';

	interface Props {
		agencyId: string;
		agencyName: string;
		commonIcons: string[];
		onClose: () => void;
	}

	let { agencyId, agencyName, commonIcons, onClose }: Props = $props();

	let selectedIcon = $state('📄');
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
	<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-header">
			<h3>Tambah Layanan Baru</h3>
			<button class="modal-close" onclick={onClose} aria-label="Tutup">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<form method="POST" action="?/create" use:enhance={() => {
			return async ({ update }) => { await update({ reset: false }); };
		}}>
			<input type="hidden" name="agency_id" value={agencyId} />

			<div class="modal-body">
				{#if agencyName}
					<div class="agency-chip">
						<span>🏛️</span>
						<span>{agencyName}</span>
					</div>
				{/if}

				<div class="form-group">
					<label for="create-name">Nama Layanan *</label>
					<input type="text" id="create-name" name="name" required placeholder="Contoh: Fasilitasi Zoom" />
				</div>
				<div class="form-group">
					<div class="icon-selector-premium">
						<div class="selection-preview">
							<div class="preview-box">
								<span class="preview-emoji">{selectedIcon || '❓'}</span>
							</div>
							<div class="preview-info">
								<label for="create-icon">Ikon Terpilih</label>
								<input type="text" id="create-icon" name="icon" bind:value={selectedIcon} placeholder="Pilih atau ketik..." class="manual-input-premium" maxlength="5" />
							</div>
						</div>
						<div class="icon-grid-scroll">
							<div class="icon-grid">
								{#each commonIcons as icon}
									<button type="button" class="icon-item-btn" class:active={selectedIcon === icon} onclick={() => selectedIcon = icon}>{icon}</button>
								{/each}
							</div>
						</div>
					</div>
				</div>
				<div class="form-group">
					<label for="create-requirements">Persyaratan</label>
					<textarea id="create-requirements" name="requirements" rows="4" placeholder="Tuliskan persyaratan layanan..."></textarea>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>Batal</button>
				<button type="submit" class="btn btn-primary">Simpan</button>
			</div>
		</form>
	</div>
</div>
