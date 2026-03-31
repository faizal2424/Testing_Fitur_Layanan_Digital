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
}} class="user-form">
    
    <div class="card">
        <h3 class="card-title">Informasi Dasar</h3>
        
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
                <label for="role">Peran (Role) <span class="required">*</span></label>
                <select id="role" name="roles" bind:value={formData.roleIds[0]} required onchange={(e) => toggleRole(e.currentTarget.value)}>
                    <option value="" disabled selected={!formData.roleIds.length}>Pilih peran pengguna</option>
                    {#each roles as role}
                        <option value={role.id}>{role.name}</option>
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
            <p class="card-help">Kosongkan kata sandi jika tidak ingin mengubahnya.</p>
        {/if}
    </div>

    <div class="form-actions">
        <button type="button" class="back-btn" onclick={() => history.back()}>Batal</button>
        <button type="submit" class="submit-btn" disabled={loading}>
            {#if loading}
                <svg class="spinner" viewBox="0 0 50 50" style="width: 18px; height: 18px; margin-right: 0.5rem; display: inline-block; vertical-align: middle;">
                    <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" style="stroke: white; stroke-linecap: round; animation: rotate 2s linear infinite, dash 1.5s ease-in-out infinite;"></circle>
                </svg>
                Memproses...
            {:else}
                {isEdit ? 'Simpan Perubahan' : 'Tambah Pengguna'}
            {/if}
        </button>
    </div>
</form>

<style>
	.user-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.form-grid-inner {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.25rem 1.5rem;
	}

	.full-width {
		grid-column: 1 / -1;
	}

	@media (max-width: 768px) {
		.form-grid-inner {
			grid-template-columns: 1fr;
		}
	}
</style>