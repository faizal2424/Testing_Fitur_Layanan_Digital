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
            {loading ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Tambah Pengguna')}
        </button>
    </div>
</form>

<style>
    /* Global Form Variables & Layout */
    .user-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-width: 800px; /* Lebar maksimal agar tidak terlalu melar di layar besar */
        margin: 0 auto;
    }

    /* Cards */
    .card, .form-actions {
        background: #ffffff;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        border: 1px solid #f1f5f9;
    }

    .card-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #0f172a;
        margin: 0 0 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .card-help {
        font-size: 0.85rem;
        color: #64748b;
        margin: 1rem 0 0;
        font-style: italic;
    }

    /* Grid Layout for Inputs */
    .form-grid-inner {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem 1.5rem;
    }

    .full-width {
        grid-column: 1 / -1;
    }

    /* Form Groups & Labels */
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #475569;
    }

    .required {
        color: #ef4444;
    }

    /* Inputs & Selects */
    input, select {
        padding: 0.75rem 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.95rem;
        font-family: inherit;
        color: #1e293b;
        background-color: #f8fafc;
        transition: all 0.2s ease;
    }

    input::placeholder {
        color: #94a3b8;
    }

    /* Custom Select Arrow */
    select {
        appearance: none;
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat;
        background-position: right 1rem top 50%;
        background-size: 0.65rem auto;
        cursor: pointer;
    }

    input:focus, select:focus {
        outline: none;
        border-color: #800020;
        background-color: #ffffff;
        box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1);
    }

    /* Actions / Buttons */
    .form-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem 2rem;
    }

    .back-btn {
        padding: 0.65rem 1.5rem;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
    }

    .back-btn:hover {
        color: #0f172a;
        background: #f1f5f9;
    }

    .submit-btn {
        padding: 0.75rem 2rem;
        background: #800020; /* Warna solid tanpa gradient untuk kesan minimalis */
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
        background: #6a001a;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(128, 0, 32, 0.2);
    }

    .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .form-grid-inner {
            grid-template-columns: 1fr;
        }
        
        .card, .form-actions {
            padding: 1.5rem;
        }
    }
</style>