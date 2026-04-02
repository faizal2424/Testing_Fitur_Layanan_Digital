<script lang="ts">
    import { enhance } from '$app/forms';

    interface UserData {
        id?: string;
        name: string;
        username: string;
        email: string;
        phone: string;
        roleIds: string[];
    }

    interface Props {
        user?: UserData;
        roles: { id: string; name: string }[];
        isEdit?: boolean;
        loading?: boolean;
    }

    let { user, roles, isEdit = false, loading = $bindable(false) }: Props = $props();

    // Form state
    let formData = $state({
        name: user?.name || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        password: '',
        password_confirmation: '',
        roleIds: user?.roleIds || (roles.length > 0 ? [roles.find(r => r.name === 'pic')?.id || roles[0].id] : [])
    });

    function toggleRole(roleId: string) {
        // Only allow 1 role
        formData.roleIds = [roleId];
    }
</script>

<form method="POST" action={isEdit ? '?/ubah' : '?/tambah'} use:enhance={() => {
    loading = true;
    return async ({ update }) => {
        loading = false;
        await update({ reset: false });
    };
}} class="user-form-container">
    
    <div class="card p-6">
        <h3 class="section-title mb-6">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
			Informasi Akun Utama
		</h3>
        
        <div class="form-grid-inner">
            <div class="form-group">
                <label for="name">Nama Lengkap <span class="required">*</span></label>
                <input type="text" id="name" name="name" bind:value={formData.name} required placeholder="Masukkan nama lengkap" />
            </div>
            
            <div class="form-group">
                <label for="username">Username <span class="required">*</span></label>
                <input type="text" id="username" name="username" bind:value={formData.username} required placeholder="username" />
            </div>

            <div class="form-group">
                <label for="email">Email <span class="required">*</span></label>
                <input type="email" id="email" name="email" bind:value={formData.email} required placeholder="email@example.com" />
            </div>

            <div class="form-group">
                <label for="phone">No. Telepon / WhatsApp</label>
                <input type="text" id="phone" name="phone" bind:value={formData.phone} placeholder="0812..." />
            </div>

            <div class="form-group full-width">
                <label for="role">Peran (Role) Akses <span class="required">*</span></label>
                <select id="role" name="roles" bind:value={formData.roleIds[0]} required onchange={(e) => toggleRole(e.currentTarget.value)}>
                    <option value="" disabled selected={!formData.roleIds.length}>Pilih peran pengguna</option>
                    {#each roles as role}
                        <option value={role.id}>{role.name.toUpperCase()}</option>
                    {/each}
                </select>
            </div>
            
            <div class="form-group">
                <label for="password">Kata Sandi {isEdit ? '' : '*'}</label>
                <input type="password" id="password" name="password" bind:value={formData.password} required={!isEdit} minlength="8" placeholder="••••••••" />
            </div>

            <div class="form-group">
                <label for="password_confirmation">Konfirmasi Kata Sandi {isEdit ? '' : '*'}</label>
                <input type="password" id="password_confirmation" name="password_confirmation" bind:value={formData.password_confirmation} required={!isEdit} placeholder="••••••••" />
            </div>
        </div>
        
        {#if isEdit}
            <div class="form-help-box mt-4">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
				Kosongkan kata sandi jika tidak ingin mengubahnya.
			</div>
        {/if}
    </div>

    <div class="form-actions-bar">
        <button type="button" class="btn btn-outline px-8" onclick={() => history.back()}>Batal</button>
        <button type="submit" class="btn btn-primary px-10" disabled={loading}>
            {#if loading}
                <svg class="spinner" viewBox="0 0 50 50" style="width: 18px; height: 18px; margin-right: 0.5rem; display: inline-block; vertical-align: middle;">
                    <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" style="stroke: white; stroke-linecap: round; animation: rotate 2s linear infinite, dash 1.5s ease-in-out infinite;"></circle>
                </svg>
                Memproses...
            {:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {isEdit ? 'Simpan Perubahan' : 'Tambah Pengguna'}
            {/if}
        </button>
    </div>
</form>

<style>
	.user-form-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

    :global(.user-form-container .card) {
        border-radius: 24px !important;
    }

    :global(.user-form-container .form-group input),
    :global(.user-form-container .form-group select) {
        border-radius: 14px !important;
        padding: 0.75rem 1.1rem !important;
    }

	.form-grid-inner {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem 1.75rem;
	}

	.full-width {
		grid-column: 1 / -1;
	}

	.form-actions-bar {
		display: flex;
		justify-content: flex-end;
		gap: 1.25rem;
		padding: 1.5rem 0;
		border-top: 1px solid var(--admin-border);
	}

    .form-help-box {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 1rem 1.25rem;
        background: #f8fafc;
        border-radius: 16px;
        font-size: 0.85rem;
        color: var(--admin-text-subtle);
        border: 1px solid #f1f5f9;
    }

    .mb-6 { margin-bottom: 1.5rem; }
    .mt-4 { margin-top: 1rem; }
	.px-8 { padding-left: 2rem; padding-right: 2rem; }
	.px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }

    .required { color: #dc2626; margin-left: 2px; }

	@media (max-width: 768px) {
		.form-grid-inner {
			grid-template-columns: 1fr;
		}

		.form-actions-bar {
			flex-direction: column-reverse;
		}

		.form-actions-bar :global(.btn) {
			width: 100%;
		}
	}
</style>