<script lang="ts">
    import { page } from '$app/stores';
    import { fade, scale } from 'svelte/transition';
    
    // Get tracking code from query param
    $: code = $page.url.searchParams.get('code');
    
    function copyToClipboard() {
        if (code) {
             navigator.clipboard.writeText(code);
             alert('Kode berhasil disalin!');
        }
    }
</script>

<div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="bg-white p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center" transition:scale>
        <div class="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg class="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
        </div>
        
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Pengajuan Berhasil!</h1>
        <p class="text-slate-500 mb-8">
            Terima kasih, formulir pengajuan Anda telah kami terima. Gunakan kode di bawah ini untuk memantau status pengajuan Anda.
        </p>
        
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 relative group">
            <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Kode Pengajuan</p>
            <p class="text-3xl font-mono font-bold text-slate-800 tracking-wider select-all">{code || 'ERROR'}</p>
            
            <button 
                on:click={copyToClipboard}
                class="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-600 transition-colors"
                title="Salin Kode"
            >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/" class="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-500/20">
                Kembali ke Beranda
            </a>
            <a href="/" class="px-6 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                Lacak Status
            </a>
        </div>
    </div>
</div>
