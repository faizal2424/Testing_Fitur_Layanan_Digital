<script lang="ts">
	import { enhance } from '$app/forms';

	interface PicUser {
		id: string;
		name: string;
		email: string;
		agency_id: string | null;
	}

	interface Props {
		service: any;
		isSuper: boolean;
		allAgencies: any[];
		commonIcons: string[];
		picUsers: PicUser[];
		onClose: () => void;
	}

	let { service, isSuper, allAgencies, commonIcons, picUsers, onClose }: Props = $props();

	let selectedIcon = $state(service.icon || '📄');
	let currentAgencyId = $state(service.agency_id || '');

	// Filter PICs by the currently selected agency
	let filteredPics = $derived(
		currentAgencyId
			? picUsers.filter((u) => u.agency_id === currentAgencyId)
			: picUsers
	);
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
	<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-header">
			<h3>Edit Layanan</h3>
			<button class="modal-close" onclick={onClose} aria-label="Tutup">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<form method="POST" action="?/update" use:enhance={() => {
			return async ({ update }) => { await update({ reset: false }); };
		}}>
			<input type="hidden" name="id" value={service.id} />
			<div class="modal-body">
				{#if isSuper}
					<div class="form-group">
						<label for="edit-agency">Instansi / OPD</label>
						<select id="edit-agency" name="agency_id" class="form-control" bind:value={currentAgencyId}>
							<option value="">Pilih Instansi...</option>
							{#each allAgencies as agency}
								<option value={agency.id}>{agency.name}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div class="form-group">
					<label for="edit-name">Nama Layanan *</label>
					<input type="text" id="edit-name" name="name" required value={service.name} />
				</div>
				<div class="form-group">
					<div class="icon-selector-premium">
						<div class="selection-preview">
							<div class="preview-box">
								<span class="preview-emoji">{selectedIcon || '❓'}</span>
							</div>
							<div class="preview-info">
								<label for="edit-icon">Ikon Terpilih</label>
								<input type="text" id="edit-icon" name="icon" bind:value={selectedIcon} placeholder="Pilih atau ketik..." class="manual-input-premium" maxlength="5" />
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

				<!-- PIC Utama -->
				<div class="form-group">
					<label for="edit-pic">PIC Utama Layanan</label>
					{#if filteredPics.length === 0}
						<div class="pic-warning">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
							<span>Tidak ada PIC di instansi ini. Tambahkan pengguna dengan peran PIC terlebih dahulu.</span>
						</div>
					{/if}
					<select id="edit-pic" name="pic_id" value={service.pic_id || ''}>
						<option value="">— Tidak Ada / Pilih Nanti —</option>
						{#each filteredPics as pic}
							<option value={pic.id}>{pic.name} ({pic.email})</option>
						{/each}
					</select>
					<small class="help-text">PIC yang dipilih akan otomatis tertugaskan saat ada pengajuan baru masuk.</small>
				</div>

				<div class="form-group">
					<label for="edit-requirements">Persyaratan</label>
					<textarea id="edit-requirements" name="requirements" rows="4">{service.requirements || ''}</textarea>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>Batal</button>
				<button type="submit" class="btn btn-primary">Simpan Perubahan</button>
			</div>
		</form>
	</div>
</div>

<style>
	.pic-warning {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		background: #fffbeb;
		color: #92400e;
		border: 1px solid #fde68a;
		border-radius: 6px;
		font-size: 0.82rem;
		margin-bottom: 0.5rem;
	}
	.pic-warning svg { flex-shrink: 0; margin-top: 1px; }
</style>
