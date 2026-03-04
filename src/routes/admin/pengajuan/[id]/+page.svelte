<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showProcessModal = $state(false);
	let newNote = $state('');
	let selectedStatus = $state(data.submission?.status || '');
	let selectedPic = $state(data.submission?.assigned_to || '');

	$effect(() => {
		if (selectedStatus !== 'ditugaskan') {
			selectedPic = data.submission?.assigned_to || '';
		}
	});

	const statusLabels: Record<string, string> = {
		baru: 'Baru',
		ditugaskan: 'Ditugaskan',
		diproses_pic: 'Diproses PIC',
		ditolak_pic: 'Ditolak PIC',
		diselesaikan_pic: 'Diselesaikan PIC',
		disetujui_pic: 'Disetujui PIC',
		ditolak_pengajuan: 'Ditolak',
		selesai: 'Selesai'
	};
	const statusColors: Record<string, string> = {
		baru: 'blue',
		ditugaskan: 'amber',
		diproses_pic: 'indigo',
		ditolak_pic: 'orange',
		diselesaikan_pic: 'teal',
		disetujui_pic: 'cyan',
		ditolak_pengajuan: 'red',
		selesai: 'green'
	};

	function getStatusLabel(s: string) {
		return statusLabels[s] || s;
	}
	function getStatusColor(s: string) {
		return statusColors[s] || 'gray';
	}

	let canEditPriority = $derived(
		(data.userRole === 'admin' || data.userRole === 'superadmin') &&
			(data.submission?.status === 'baru' || data.submission?.status === 'ditolak_pic') &&
			selectedStatus === 'ditugaskan'
	);

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isFileField(type: string) {
		return type === 'file';
	}
</script>

<svelte:head><title>Detail Pengajuan — Layanan Digital</title></svelte:head>

{#if !data.submission}
	<div class="page"><p>Pengajuan tidak ditemukan.</p></div>
{:else}
	<div class="page">
		<div class="breadcrumb">
			<a href="/admin/pengajuan">← Kembali ke Pengajuan</a>
		</div>

		<!-- Header -->
		<div class="detail-header">
			<div class="header-left">
				<div class="tracking-row">
					<code class="tracking-code">{data.submission.tracking_code}</code>
					{#if data.submission.is_priority}
						<span class="priority-badge">⚡ Prioritas</span>
					{/if}
					<span class="status-badge {getStatusColor(data.submission.status)}"
						>{getStatusLabel(data.submission.status)}</span
					>
				</div>
				<h2 class="detail-title">
					{#if data.submission.service_icon}{data.submission.service_icon}{/if}
					{data.submission.service_name}
				</h2>
				<p class="detail-meta">
					Diajukan oleh <strong>{data.submission.applicant_name}</strong> • {formatDate(
						data.submission.created_at
					)}
				</p>
			</div>
		</div>

		{#if form?.success}
			<div class="alert alert-success">{form.message}</div>
		{/if}
		{#if form?.error}
			<div class="alert alert-error">{form.error}</div>
		{/if}

		<div class="detail-grid">
			<!-- Left: Form Data -->
			<div class="detail-main">
				<!-- Info Card -->
				<div class="card">
					<h3 class="card-title">Informasi Pemohon</h3>
					<div class="info-grid">
						<div class="info-item">
							<span class="info-label">Nama</span>
							<span class="info-value">{data.submission.applicant_name}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Email</span>
							<span class="info-value">{data.submission.applicant_email}</span>
						</div>
						<div class="info-item">
							<span class="info-label">PIC</span>
							<span class="info-value"
								>{data.submission.assigned_to_name || 'Belum ditugaskan'}</span
							>
						</div>
						<div class="info-item">
							<span class="info-label">Terakhir Diperbarui</span>
							<span class="info-value">{formatDate(data.submission.updated_at)}</span>
						</div>
						<div class="info-item" style="grid-column: span 2;">
							<span class="info-label">Anggota Tim</span>
							<span class="info-value">
								{#if data.teamMembers.length > 0}
									{data.teamMembers.map((tm) => tm.name).join(', ')}
								{:else}
									<span class="empty-text">Belum ada anggota tim</span>
								{/if}
							</span>
						</div>
					</div>
				</div>

				<!-- Form Values -->
				<div class="card">
					<h3 class="card-title">Data Formulir</h3>
					{#if data.values.length === 0}
						<p class="empty-text">Tidak ada data formulir.</p>
					{:else}
						<div class="form-values">
							{#each data.values as val}
								<div class="value-item">
									<span class="value-label">{val.label}</span>
									{#if isFileField(val.type) && val.file_path}
										<a href="/storage/{val.file_path}" target="_blank" class="file-link">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												><path
													d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
												/><polyline points="14 2 14 8 20 8" /></svg
											>
											{val.file_path.split('/').pop()}
										</a>
									{:else}
										<span class="value-content">{val.value || '-'}</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Right: Notes & Timeline -->
			<div class="detail-sidebar">
				<!-- Timeline -->
				<div class="card">
					<h3 class="card-title">Riwayat & Catatan</h3>
					{#if data.notes.length === 0}
						<p class="empty-text">Belum ada catatan.</p>
					{:else}
						<div class="timeline">
							{#each data.notes as note}
								<div class="timeline-item">
									<div class="timeline-dot" class:status-change={note.status_to}></div>
									<div class="timeline-content">
										{#if note.status_to}
											<div class="timeline-status">
												{#if note.status_from}
													<span class="status-badge sm {getStatusColor(note.status_from)}"
														>{getStatusLabel(note.status_from)}</span
													>
													<span class="arrow">→</span>
												{/if}
												<span class="status-badge sm {getStatusColor(note.status_to)}"
													>{getStatusLabel(note.status_to)}</span
												>
											</div>
										{/if}
										{#if note.note}
											<p class="timeline-note">{note.note}</p>
										{/if}
										<div class="timeline-meta">
											<span>{note.user_name}</span> • <span>{formatDate(note.created_at)}</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="bottom-actions">
			<a href="/admin/pengajuan" class="btn btn-outline btn-lg">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
				>
				Kembali
			</a>
			{#if data.allowedStatuses.length > 0}
				<button
					class="btn btn-primary btn-lg"
					onclick={() => {
						showProcessModal = true;
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg
					>
					Proses Pengajuan
				</button>
			{/if}
		</div>
	</div>

	<!-- Process Modal -->
	{#if showProcessModal}
		<div
			class="modal-overlay"
			onclick={() => {
				showProcessModal = false;
			}}
			role="presentation"
		>
			<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
				<div class="modal-header">
					<h3>Proses Pengajuan</h3>
					<button
						class="modal-close"
						onclick={() => {
							showProcessModal = false;
						}}>✕</button
					>
				</div>
				<form
					method="POST"
					action="?/process"
					use:enhance={() => {
						return async ({ update }) => {
							showProcessModal = false;
							await update();
						};
					}}
				>
					<div class="modal-body">
						<div class="form-group">
							<label for="new-status">Status Pengajuan</label>
							<select id="new-status" name="status" bind:value={selectedStatus} required>
								<option value={data.submission.status}
									>{statusLabels[data.submission.status]}</option
								>
								{#each data.allowedStatuses as v}
									{#if statusLabels[v] && v !== data.submission.status}
										<option value={v}>{statusLabels[v]}</option>
									{/if}
								{/each}
							</select>
						</div>

						<div class="form-group checkbox-group" style={!canEditPriority ? 'opacity: 0.7;' : ''}>
							<label
								for="is_priority"
								class="checkbox-label"
								style={!canEditPriority ? 'cursor: not-allowed;' : ''}
							>
								<input
									type="checkbox"
									id="is_priority"
									name="is_priority"
									checked={data.submission?.is_priority}
									disabled={!canEditPriority}
								/>
								<span>Tandai sebagai Prioritas Tinggi ⚡</span>
							</label>
							{#if !canEditPriority && data.userRole !== 'pic'}
								<small class="help-text"
									>Prioritas hanya dapat diatur saat menugaskan PIC untuk pertama kali (dari
									Baru/Ditolak PIC).</small
								>
							{:else}
								<small class="help-text">Read-only untuk PIC.</small>
							{/if}
						</div>

						{#if data.userRole !== 'pic'}
							<div
								class="form-group"
								style={selectedStatus !== 'ditugaskan' ? 'opacity: 0.6;' : ''}
							>
								<label for="pic-select">Penugasan PIC Utama</label>
								<select
									id="pic-select"
									name="pic_id"
									bind:value={selectedPic}
									disabled={selectedStatus !== 'ditugaskan'}
									required={selectedStatus === 'ditugaskan'}
								>
									<option value="">— Tidak ada PIC —</option>
									{#each data.picUsers as u}
										<option value={u.id}>{u.name} ({u.email})</option>
									{/each}
								</select>
								<small class="help-text">
									{#if selectedStatus === 'ditugaskan'}
										Pilih PIC yang akan ditugaskan.
									{:else}
										Penugasan PIC hanya dapat diubah pada status "Ditugaskan".
									{/if}
								</small>
							</div>
						{/if}

						<div class="form-group">
							<label>Pilih Anggota Tim (Bantuan PIC)</label>
							<div class="team-selection">
								{#each data.picUsers as u}
									{#if u.id !== selectedPic}
										<label class="checkbox-label sm">
											<input
												type="checkbox"
												name="team_members"
												value={u.id}
												checked={data.teamMembers.some((tm) => tm.id === u.id)}
											/>
											<span>{u.name}</span>
										</label>
									{/if}
								{:else}
									<p class="empty-text">Tidak ada PIC lain tersedia.</p>
								{/each}
							</div>
							<small class="help-text"
								>Centang PIC lain yang membantu menangani pengajuan ini (selain PIC Utama).</small
							>
						</div>

						<div class="form-group">
							<label for="status-note">Catatan Tambahan</label>
							<textarea
								id="status-note"
								name="note"
								rows="4"
								placeholder="Tuliskan catatan terkait pemrosesan ini..."
							></textarea>
						</div>
					</div>
					<div class="modal-footer">
						<button
							type="button"
							class="btn btn-outline"
							onclick={() => {
								showProcessModal = false;
							}}>Batal</button
						>
						<button type="submit" class="btn btn-primary">Simpan Perubahan</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
{/if}

<style>
	.page {
		max-width: 1200px;
		margin: 0 auto;
	}
	.breadcrumb {
		margin-bottom: 1rem;
	}
	.breadcrumb a {
		font-size: 0.85rem;
		color: #6b7280;
		text-decoration: none;
	}
	.breadcrumb a:hover {
		color: #800020;
	}

	.detail-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.tracking-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}
	.tracking-code {
		background: #f3f4f6;
		padding: 0.3rem 0.6rem;
		border-radius: 8px;
		font-size: 0.82rem;
		font-weight: 700;
		color: #374151;
	}
	.priority-badge {
		background: #fffbeb;
		color: #d97706;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		border: 1px solid #fde68a;
	}
	.detail-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.3rem;
	}
	.detail-meta {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 10px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
		border: none;
		text-decoration: none;
	}
	.btn-sm {
		padding: 0.45rem 0.85rem;
		font-size: 0.82rem;
	}
	.btn-primary {
		background: linear-gradient(135deg, #800020, #a80030);
		color: white;
		box-shadow: 0 2px 8px rgba(128, 0, 32, 0.25);
	}
	.btn-primary:hover {
		transform: translateY(-1px);
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}
	.btn-outline {
		background: white;
		color: #374151;
		border: 1.5px solid #e5e7eb;
	}
	.btn-outline:hover {
		background: #f9fafb;
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}
	.alert-success {
		background: #f0fdf4;
		color: #16a34a;
		border: 1px solid #bbf7d0;
	}
	.alert-error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 380px;
		gap: 1.5rem;
		align-items: start;
	}

	.card {
		background: white;
		border-radius: 14px;
		padding: 1.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid #f3f4f6;
		margin-bottom: 1rem;
	}
	.card-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 1rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.info-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.info-value {
		font-size: 0.88rem;
		color: #111827;
		font-weight: 500;
	}

	.form-values {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.value-item {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #f3f4f6;
	}
	.value-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
	.value-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
	}
	.value-content {
		font-size: 0.88rem;
		color: #111827;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.file-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: #800020;
		font-size: 0.85rem;
		font-weight: 500;
		text-decoration: none;
	}
	.file-link:hover {
		text-decoration: underline;
	}

	.empty-text {
		font-size: 0.85rem;
		color: #9ca3af;
		margin: 0;
	}

	/* Notes form */
	textarea {
		width: 100%;
		padding: 0.6rem 0.85rem;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		font-size: 0.85rem;
		color: #1f2937;
		background: #f9fafb;
		font-family: inherit;
		resize: vertical;
		box-sizing: border-box;
	}
	textarea:focus {
		outline: none;
		border-color: #800020;
		box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1);
		background: white;
	}

	/* Timeline */
	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.timeline-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f9fafb;
		position: relative;
	}
	.timeline-item:last-child {
		border-bottom: none;
	}
	.timeline-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #e5e7eb;
		margin-top: 0.3rem;
		flex-shrink: 0;
	}
	.timeline-dot.status-change {
		background: #800020;
	}
	.timeline-content {
		flex: 1;
		min-width: 0;
	}
	.timeline-status {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.3rem;
		flex-wrap: wrap;
	}
	.arrow {
		font-size: 0.75rem;
		color: #9ca3af;
	}
	.timeline-note {
		font-size: 0.82rem;
		color: #374151;
		margin: 0.2rem 0;
		line-height: 1.5;
	}
	.timeline-meta {
		font-size: 0.72rem;
		color: #9ca3af;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.6rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.status-badge.sm {
		padding: 0.15rem 0.45rem;
		font-size: 0.68rem;
	}
	.status-badge.blue {
		background: #eff6ff;
		color: #2563eb;
	}
	.status-badge.amber {
		background: #fffbeb;
		color: #d97706;
	}
	.status-badge.indigo {
		background: #eef2ff;
		color: #4f46e5;
	}
	.status-badge.orange {
		background: #fff7ed;
		color: #ea580c;
	}
	.status-badge.teal {
		background: #f0fdfa;
		color: #0d9488;
	}
	.status-badge.cyan {
		background: #ecfeff;
		color: #0891b2;
	}
	.status-badge.green {
		background: #f0fdf4;
		color: #16a34a;
	}
	.status-badge.red {
		background: #fef2f2;
		color: #dc2626;
	}
	.status-badge.gray {
		background: #f9fafb;
		color: #6b7280;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}
	.modal {
		background: white;
		border-radius: 16px;
		width: 100%;
		max-width: 480px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: modalIn 0.2s ease-out;
	}
	@keyframes modalIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #f3f4f6;
	}
	.modal-header h3 {
		font-size: 1.05rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
	}
	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: none;
		background: #f3f4f6;
		color: #6b7280;
		cursor: pointer;
		font-size: 1rem;
	}
	.modal-close:hover {
		background: #e5e7eb;
	}
	.modal-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid #f3f4f6;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.form-group label {
		font-size: 0.82rem;
		font-weight: 600;
		color: #374151;
	}
	.form-group select,
	.form-group textarea {
		padding: 0.6rem 0.85rem;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		font-size: 0.85rem;
		color: #1f2937;
		background: #f9fafb;
		font-family: inherit;
	}
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #800020;
		box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1);
		background: white;
	}
	.current-status-label {
		font-size: 0.85rem;
		color: #374151;
		margin: 0;
	}

	.bottom-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px dashed #e5e7eb;
	}
	.btn-lg {
		padding: 0.8rem 1.5rem;
		font-size: 1.05rem;
	}

	.checkbox-group {
		flex-direction: row;
		align-items: center;
	}
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		color: #111827;
	}
	.checkbox-label input[type='checkbox'] {
		width: 1.1rem;
		height: 1.1rem;
		cursor: pointer;
		accent-color: #800020;
	}
	.help-text {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.2rem;
	}

	.team-selection {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		max-height: 150px;
		overflow-y: auto;
		padding: 0.75rem;
		background: #f9fafb;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
	}
	.checkbox-label.sm {
		font-size: 0.8rem;
	}
	.checkbox-label.sm input {
		width: 0.9rem;
		height: 0.9rem;
	}

	@media (max-width: 900px) {
		.detail-grid {
			grid-template-columns: 1fr;
		}
		.detail-header {
			flex-direction: column;
		}
	}
</style>
