<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showProcessModal = $state(false);
	let newNote = $state('');
	
	// Local state for modal fields, initialized from props
	let selectedStatus = $state(data.submission?.status || '');
	let selectedPic = $state(data.submission?.assigned_to || '');
	let statusError = $state('');
	let showToast = $state(false);
	let toastMessage = $state('');

	$effect(() => {
		if (selectedStatus !== data.submission?.status) {
			statusError = '';
		}
	});

	function triggerToast(message: string) {
		toastMessage = message;
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 5000);
	}

	// Reset local state if data props change (Svelte 5 recommendation for copy-state)
	$effect(() => {
		selectedStatus = data.submission?.status || '';
		selectedPic = data.submission?.assigned_to || '';
	});

	$effect(() => {
		if (selectedStatus !== 'ditugaskan') {
			selectedPic = data.submission?.assigned_to || '';
		}
	});

	let teamSearch = $state('');
	let showTeamDropdown = $state(false);
	let selectedTeamIds = $state<string[]>((data.teamMembers || []).map(tm => tm.id));

	$effect(() => {
		selectedTeamIds = (data.teamMembers || []).map(tm => tm.id);
	});

	let filteredAssistantPICs = $derived(
		(data.assistantPICs || []).filter(u => 
			u.id !== selectedPic && 
			(u.name.toLowerCase().includes(teamSearch.toLowerCase()) || 
			 u.email.toLowerCase().includes(teamSearch.toLowerCase()))
		)
	);

	function toggleTeamMember(id: string) {
		if (selectedTeamIds.includes(id)) {
			selectedTeamIds = selectedTeamIds.filter(i => i !== id);
		} else {
			selectedTeamIds = [...selectedTeamIds, id];
		}
	}

	let teamContainer = $state<HTMLElement>();
	$effect(() => {
		const handleClick = (e: MouseEvent) => {
			if (teamContainer && !teamContainer.contains(e.target as Node)) {
				showTeamDropdown = false;
			}
		};
		window.addEventListener('click', handleClick);
		return () => window.removeEventListener('click', handleClick);
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
						{#if data.userRole === 'pic' || (data.submission.status !== 'baru' && data.submission.status !== 'ditugaskan')}
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
						{/if}
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
			{#if data.allowedStatuses.length > 0 && !data.isAssistantOnly}
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
			onkeydown={(e) => {
				if (e.key === 'Escape') showProcessModal = false;
			}}
			role="presentation"
		>
			<div 
				class="modal" 
				onclick={(e) => e.stopPropagation()} 
				onkeydown={(e) => e.stopPropagation()}
				role="dialog"
				tabindex="-1"
			>
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
					use:enhance={({ cancel }) => {
						if (selectedStatus === data.submission?.status) {
							statusError = 'Status belum diubah. Silakan pilih status baru sebelum menyimpan perubahan.';
							cancel();
							return;
						}
						return async ({ update, result }) => {
							showProcessModal = false;
							await update();
							if (result.type === 'success' && result.data?.success) {
								triggerToast(result.data.message as string);
							}
						};
					}}
				>
					<div class="modal-body">
						{#if statusError}
							<div class="alert alert-error" style="margin-bottom: 1rem;">
								{statusError}
							</div>
						{/if}
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

						{#if data.userRole === 'pic'}
							<!-- PIC can manage team ONLY during transition from ditugaskan -->
							{#if data.submission.status === 'ditugaskan' && !data.isAssistantOnly}
								<div class="form-group">
									<label for="team-search">Anggota Tim (Bantuan PIC)</label>
									<div class="custom-multi-select" bind:this={teamContainer}>
										<div 
											class="select-trigger" 
											onclick={() => showTeamDropdown = !showTeamDropdown}
											onkeydown={(e) => e.key === 'Enter' && (showTeamDropdown = !showTeamDropdown)}
											role="button"
											tabindex="0"
										>
											{#if selectedTeamIds.length > 0}
												<div class="selected-tags">
													{#each selectedTeamIds as id}
														{@const pic = data.assistantPICs.find(u => u.id === id)}
														{#if pic}
															<span class="tag">
																{pic.name}
																<button type="button" onclick={(e) => { e.stopPropagation(); toggleTeamMember(id); }}>✕</button>
															</span>
														{/if}
													{/each}
												</div>
											{:else}
												<span class="placeholder">Pilih Anggota Tim...</span>
											{/if}
											<span class="arrow">{showTeamDropdown ? '▲' : '▼'}</span>
										</div>

										{#if showTeamDropdown}
											<div class="select-dropdown" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
												<div class="search-box">
													<input 
														type="text" 
														id="team-search"
														placeholder="Cari PIC..." 
														bind:value={teamSearch}
														autocomplete="off"
													/>
												</div>
												<div class="options-list">
													{#each filteredAssistantPICs as u}
														<label class="option-item">
															<input 
																type="checkbox" 
																checked={selectedTeamIds.includes(u.id)}
																onchange={() => toggleTeamMember(u.id)}
															/>
															<div class="option-info">
																<span class="option-name">{u.name}</span>
																<span class="option-email">{u.email}</span>
															</div>
														</label>
													{:else}
														<div class="empty-results">Tidak ada PIC ditemukan.</div>
													{/each}
												</div>
											</div>
										{/if}
									</div>
									
									<!-- Hidden inputs for form submission -->
									{#each selectedTeamIds as id}
										<input type="hidden" name="team_members" value={id} />
									{/each}
									
									<small class="help-text">Klik untuk mencari dan memilih beberapa anggota tim pembantu.</small>
								</div>
							{:else}
								<!-- Locked for PIC after diproses_pic or if Assistant -->
								<div class="form-group">
									<span class="fake-label">Anggota Tim</span>
									<div class="read-only-box">
										{#if data.teamMembers.length > 0}
											{data.teamMembers.map((tm) => tm.name).join(', ')}
										{:else}
											<span class="empty-text">Tidak ada anggota tim</span>
										{/if}
									</div>
									<small class="help-text">
										{#if data.isAssistantOnly}
											Hanya PIC Utama yang dapat mengelola anggota tim.
										{:else}
											Anggota tim hanya dapat diatur saat status "Ditugaskan".
										{/if}
									</small>
								</div>
							{/if}
						{:else if data.submission.status !== 'baru' && data.submission.status !== 'ditugaskan'}
							<!-- Admin sees read-only list after assignment stage -->
							<div class="form-group">
								<span class="fake-label">Anggota Tim</span>
								<div class="read-only-box">
									{#if data.teamMembers.length > 0}
										{data.teamMembers.map((tm) => tm.name).join(', ')}
									{:else}
										<span class="empty-text">Belum ada anggota tim</span>
									{/if}
								</div>
								<small class="help-text">Hanya PIC yang dapat mengelola anggota tim pembantu.</small>
							</div>
						{/if}

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
						<button type="submit" class="btn btn-primary">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
							Simpan Perubahan
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showToast}
		<div class="toast-container">
			<div class="toast success">
				<div class="toast-icon">✓</div>
				<div class="toast-content">{toastMessage}</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.page {
		max-width: 1200px;
		margin: 0 auto;
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
		gap: 0.5rem;
		padding: 0.6rem 1.25rem;
		border-radius: 10px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
		border: none;
		text-decoration: none;
		white-space: nowrap;
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


	.read-only-box {
		padding: 0.75rem;
		background: #f9fafb;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		font-size: 0.85rem;
		color: #374151;
		min-height: 40px;
		display: flex;
		align-items: center;
	}

	.fake-label {
		display: block;
		font-size: 0.88rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	/* Custom Multi-select Searchable Dropdown */
	.custom-multi-select {
		position: relative;
		width: 100%;
	}

	.select-trigger {
		background: #f9fafb;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		padding: 0.6rem 2.5rem 0.6rem 0.75rem;
		min-height: 44px;
		display: flex;
		align-items: center;
		cursor: pointer;
		position: relative;
		transition: all 0.2s;
	}

	.select-trigger:focus {
		outline: none;
		border-color: #800020;
		box-shadow: 0 0 0 3px rgba(128,0,32,0.1);
	}

	.select-trigger .arrow {
		position: absolute;
		right: 1rem;
		font-size: 0.7rem;
		color: #9ca3af;
	}

	.placeholder {
		color: #9ca3af;
		font-size: 0.85rem;
	}

	.selected-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tag {
		background: #ebf5ff;
		color: #1e40af;
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		border: 1px solid #bfdbfe;
	}

	.tag button {
		background: none;
		border: none;
		color: #1e40af;
		font-size: 0.8rem;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.select-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 100;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		margin-top: 0.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		max-height: 300px;
	}

	.search-box {
		padding: 0.75rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.search-box input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.85rem;
	}

	.options-list {
		overflow-y: auto;
		padding: 0.5rem;
	}

	.option-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.option-item:hover {
		background: #f9fafb;
	}

	.option-item input[type="checkbox"] {
		width: 16px;
		height: 16px;
		accent-color: #800020;
	}

	.option-info {
		display: flex;
		flex-direction: column;
	}

	.option-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #374151;
	}

	.option-email {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.empty-results {
		padding: 2rem 1rem;
		text-align: center;
		font-size: 0.85rem;
		color: #9ca3af;
	}

	/* Toast Notification */
	.toast-container {
		position: fixed;
		top: 2rem;
		right: 2rem;
		z-index: 9999;
		animation: toast-in 0.3s ease-out;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		min-width: 300px;
		border-left: 4px solid #10b981;
	}

	.toast-icon {
		background: #10b981;
		color: white;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.toast-content {
		font-size: 0.9rem;
		font-weight: 600;
		color: #111827;
	}

	@keyframes toast-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
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
