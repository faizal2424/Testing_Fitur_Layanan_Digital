<script lang="ts">
    import { page } from '$app/stores';
    import { fade, scale, fly } from 'svelte/transition';
    import type { PageData } from './$types';

    export let data: PageData;

    $: code = data.trackingCode;
    $: submission = data.submission;

    let copied = false;
    let isDownloading = false;

    function copyToClipboard() {
        if (code) {
            navigator.clipboard.writeText(code);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        }
    }

    async function downloadSuratBukti() {
        if (!code || isDownloading) return;
        isDownloading = true;

        try {
            const response = await fetch(`/api/surat-bukti/${code}`);
            if (!response.ok) {
                throw new Error('Gagal mengunduh surat bukti');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `surat-bukti-pengajuan-${code}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Gagal mengunduh surat bukti pengajuan. Silakan coba lagi.');
            console.error(err);
        } finally {
            isDownloading = false;
        }
    }
</script>

<svelte:head>
    <title>Pengajuan Berhasil — Layanan Digital APTIKA</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 flex items-center justify-center p-4">
    <div class="max-w-lg w-full space-y-6" transition:fade={{ duration: 300 }}>

        <!-- Main Success Card -->
        <div class="bg-white p-8 md:p-10 rounded-3xl shadow-2xl shadow-green-500/5 border border-green-100/50 text-center" transition:scale={{ start: 0.95, duration: 400 }}>

            <!-- Success Icon -->
            <div class="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200/50">
                <svg class="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <h1 class="text-3xl font-bold text-slate-900 mb-3">Pengajuan Berhasil!</h1>
            <p class="text-slate-500 mb-8 leading-relaxed">
                Terima kasih, formulir pengajuan Anda telah kami terima. Gunakan kode di bawah ini untuk memantau status pengajuan Anda.
            </p>

            <!-- Tracking Code Box -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 relative group">
                <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Kode Pengajuan</p>
                <p class="text-3xl font-mono font-bold text-slate-800 tracking-wider select-all">{code || 'ERROR'}</p>

                <button
                    on:click={copyToClipboard}
                    class="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all
                        {copied ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}"
                    title="Salin Kode"
                >
                    {#if copied}
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    {:else}
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    {/if}
                </button>
            </div>

            <!-- Submission Details -->
            {#if submission}
                <div class="text-left bg-slate-50/50 border border-slate-100 rounded-2xl p-5 mb-6 space-y-3">
                    <div class="flex items-center gap-2 mb-3">
                        <div class="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Detail Pengajuan</p>
                    </div>

                    {#if submission.applicant_name}
                        <div class="flex justify-between items-center py-1">
                            <span class="text-sm text-slate-500">Nama Pemohon</span>
                            <span class="text-sm font-semibold text-slate-800">{submission.applicant_name}</span>
                        </div>
                    {/if}
                    {#if submission.services?.name}
                        <div class="flex justify-between items-center py-1">
                            <span class="text-sm text-slate-500">Layanan</span>
                            <span class="text-sm font-semibold text-slate-800">{submission.services.name}</span>
                        </div>
                    {/if}
                    <div class="flex justify-between items-center py-1">
                        <span class="text-sm text-slate-500">Status</span>
                        <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            Menunggu Proses
                        </span>
                    </div>
                </div>
            {/if}

            <!-- Action Buttons -->
            <div class="flex flex-col gap-3">
                <!-- Download Surat Bukti -->
                <button
                    on:click={downloadSuratBukti}
                    disabled={isDownloading}
                    class="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl
                        hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-red-500/25
                        disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                    {#if isDownloading}
                        <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Mengunduh...</span>
                    {:else}
                        <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Download Surat Bukti Pengajuan</span>
                    {/if}
                </button>

                <div class="flex flex-col sm:flex-row gap-3">
                    <a href="/" class="flex-1 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-500/20 text-center">
                        Kembali ke Beranda
                    </a>
                    <a href="/" class="flex-1 px-6 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-center">
                        Lacak Status
                    </a>
                </div>
            </div>
        </div>

        <!-- Floating Note -->
        <div class="text-center" transition:fly={{ y: 10, duration: 300, delay: 200 }}>
            <p class="text-xs text-slate-400">
                📧 Bukti pengajuan juga dapat diunduh kapan saja melalui halaman status pengajuan.
            </p>
        </div>
    </div>
</div>
