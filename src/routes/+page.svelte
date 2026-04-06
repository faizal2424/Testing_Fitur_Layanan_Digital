<script lang="ts">
  import { fade, slide, fly } from 'svelte/transition';
  import { enhance } from '$app/forms';
  import { cubicOut } from 'svelte/easing';
  import type { PageData, ActionData } from './$types';
  import Footer from '$lib/components/Footer.svelte';

  export let data: PageData;
  export let form: ActionData;

  let searchQuery = "";
  let isSearching = false;
  let selectedLayanan: any = null;
  let activeAgencyName: string | null = null;

  // Filter List Layanan dari database
  $: filteredLayanan = data.listLayanan.filter((l: any) => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mengelompokkan berdasarkan instansi
  let groupedLayanan: Record<string, any[]> = {};
  $: groupedLayanan = filteredLayanan.reduce((groups: Record<string, any[]>, l: any) => {
    const agencyName = l.agencies?.name || 'Layanan Umum (Semua Instansi)';
    if (!groups[agencyName]) {
      groups[agencyName] = [];
    }
    groups[agencyName].push(l);
    return groups;
  }, {});

  const STATUS_FLOW = [
    { key: 'baru', label: 'Diterima' },
    { key: 'revisi', label: 'Perlu Revisi' },
    { key: 'ditugaskan', label: 'Verifikasi' },
    { key: 'diproses_pic', label: 'Proses' },
    { key: 'diselesaikan_pic', label: 'Validasi' },
    { key: 'selesai', label: 'Selesai' }
  ];

  function getStepIndex(status: string) {
    if (status === 'ditolak_pengajuan') return -1;
    const map: Record<string, number> = { 
      'baru': 0, 'revisi': 1, 'ditugaskan': 2, 'diproses_pic': 3, 'diselesaikan_pic': 4, 'selesai': 5 
    };
    return map[status] ?? 0;
  }
</script>

<div class="min-h-screen bg-white font-sans text-slate-900">
  
  <!-- Hero Section with Abstract Background -->
  <header class="relative pt-24 pb-32 px-4 overflow-hidden">
    <div class="absolute inset-0 z-0 opacity-10">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 0 L100 0 L100 80 Q50 100 0 80 Z" fill="url(#grad1)" />
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#991b1b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
                </linearGradient>
            </defs>
        </svg>
    </div>
    
    <!-- Menu / Navigation Link -->
    <div class="absolute top-6 right-6 z-20">
        <a href="/about" class="text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200 hover:ring-red-200 hover:shadow-md flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tentang Kami
        </a>
    </div>

    <div class="relative z-10 max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center justify-center p-3 mb-8 bg-white/50 backdrop-blur-sm rounded-full shadow-sm ring-1 ring-slate-200">
          <img src="/img/kabupatensemarang.png" alt="Logo" class="h-8 mr-3" />
          <span class="text-sm font-semibold text-slate-600 tracking-wide uppercase">Layanan Digital APTIKA</span>
      </div>
      
      <h1 class="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-slate-900">
        Pengajuan Layanan <br/>
        <span class="bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-slate-900">Lebih Mudah & Transparan</span>
      </h1>
      
      <p class="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
        Ajukan layanan digital secara online dan pantau status permohonan Anda secara real-time.
      </p>

      <!-- Tracking Form -->
      <form 
        method="POST" 
        action="?/checkStatus" 
        use:enhance={() => {
          isSearching = true;
          return async ({ update }) => {
            await update();
            isSearching = false;
          };
        }}
        class="max-w-md mx-auto relative group"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-red-600 to-slate-800 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div class="relative flex items-center bg-white p-2 rounded-full shadow-xl ring-1 ring-slate-100">
            <input 
            name="code"
            type="text" 
            placeholder="Masukkan Kode Pengajuan..." 
            class="flex-1 bg-transparent border-none focus:ring-0 px-6 py-3 text-slate-700 placeholder-slate-400 font-medium w-full outline-none"
            required
            />
            <button 
            type="submit"
            class="bg-slate-900 hover:bg-red-700 text-white p-3 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg transform active:scale-95"
            disabled={isSearching}
            >
            {#if isSearching}
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {:else}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            {/if}
            </button>
        </div>
      </form>

      {#if form?.message && !form.success}
        <p class="mt-4 text-red-500 text-sm font-medium bg-red-50 inline-block px-4 py-2 rounded-lg" transition:fade>{form.message}</p>
      {/if}
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-10 relative z-20">
    
    <!-- Status Result Modal -->
    {#if form?.success && form.result}
      <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
        transition:fade={{ duration: 200 }}
        on:click|self={() => form = null}
        on:keydown={(e) => e.key === 'Escape' && (form = null)}
      >
        <section 
            class="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto" 
            transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
        >
            <!-- Close Button -->
            <button 
                type="button"
                aria-label="Tutup"
                on:click={() => form = null}
                class="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors z-10"
            >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-slate-100 pr-12">
            <div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Kode Pengajuan</span>
                <p class="text-3xl font-bold text-slate-800 tracking-tight">{form.result.code}</p>
            </div>
            <div class="mt-4 md:mt-0 flex items-center gap-3">
                <span class="text-sm text-slate-500">Status Saat Ini:</span>
                <span class={`px-5 py-2 rounded-full text-sm font-bold border ${form.result.status === 'revisi' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {form.result.status_txt}
                </span>
            </div>
            </div>

            {#if form.result.status === 'revisi'}
                <div class="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl" transition:fade>
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-amber-800 font-bold mb-1">Catatan Revisi dari Admin</h3>
                            <p class="text-amber-700 text-sm leading-relaxed mb-4">
                                {form.result.submission_notes?.[0]?.note || 'Mohon periksa kembali data Anda sesuai instruksi admin.'}
                            </p>
                            <a 
                                href="/tracking/{form.result.code}/edit"
                                class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-200"
                            >
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Perbaiki Data Sekarang
                            </a>
                        </div>
                    </div>
                </div>
            {:else if form.result.status === 'ditolak_pengajuan'}
                <div class="mb-10 text-center" transition:fade>
                    <div class="relative inline-block mb-6">
                        <div class="absolute inset-0 bg-red-400 blur-2xl opacity-20 animate-pulse"></div>
                        <div class="relative w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-3xl flex items-center justify-center shadow-xl shadow-red-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <svg class="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>
                    
                    <h2 class="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Pengajuan Ditolak</h2>
                    <p class="text-slate-400 font-medium mb-8">Maaf, permohonan Anda tidak dapat dilanjutkan.</p>

                    <div class="max-w-xl mx-auto bg-white border border-red-100 rounded-3xl p-8 shadow-2xl shadow-red-500/5 relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                            <svg class="w-32 h-32 text-red-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </div>
                        
                        <div class="relative z-10 text-left">
                            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-3 block">Alasan Penolakan</span>
                            <blockquote class="text-lg font-medium text-slate-700 leading-relaxed italic border-l-4 border-red-500 pl-4 py-1">
                                "{form.result.submission_notes?.[0]?.note || 'Informasi alasan penolakan belum tersedia.'}"
                            </blockquote>
                        </div>

                        <div class="mt-8 pt-6 border-t border-slate-50 flex flex-col sm:flex-row gap-3 justify-center">
                            <a href="/" class="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/20 text-center">
                                Buat Pengajuan Baru
                            </a>
                            <a href="https://wa.me/6281123456789" target="_blank" class="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all text-center">
                                Hubungi Kami
                            </a>
                        </div>
                    </div>
                </div>
            {/if}

            <div class="grid md:grid-cols-3 gap-12" class:opacity-50={form.result.status === 'ditolak_pengajuan'} class:pointer-events-none={form.result.status === 'ditolak_pengajuan'}>
                {#if form.result.status !== 'ditolak_pengajuan'}
                    <div class="md:col-span-1 space-y-6">
                        <div class="group">
                            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Layanan</span>
                            <span class="font-semibold text-slate-800 text-lg group-hover:text-red-700 transition-colors">
                                {form.result.service_name || 'Layanan Digital'}
                            </span>
                        </div>
                        <div class="group">
                            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">PIC / Kontak</span>
                            <span class="font-semibold text-slate-800 text-lg group-hover:text-red-700 transition-colors">
                                {form.result.pic_phone || 'Menunggu Penugasan'}
                            </span>
                        </div>
                    </div>

                    <!-- Timeline -->
                    <div class="md:col-span-2 relative pl-4 md:pl-0">
                        <div class="space-y-0">
                            {#each STATUS_FLOW as step, i}
                                <div class="flex items-start gap-4 relative pb-8 last:pb-0 group">
                                    <!-- Line Connector -->
                                    {#if i < STATUS_FLOW.length - 1}
                                        <div class={`absolute left-[11px] top-7 bottom-0 w-[2px] ${i < getStepIndex(form.result.status) ? 'bg-red-600' : 'bg-slate-100'}`}></div>
                                    {/if}
                                    
                                    <!-- Status Circle -->
                                    <div class={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500
                                        ${i <= getStepIndex(form.result.status) ? 'bg-red-600 border-red-600 scale-110 shadow-lg shadow-red-200' : 'bg-white border-slate-200'}`}>
                                        {#if i <= getStepIndex(form.result.status)}
                                            <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                                        {/if}
                                    </div>

                                    <!-- Status Text -->
                                    <div class="pt-[2px]">
                                        <p class={`text-sm font-bold transition-colors 
                                            ${i <= getStepIndex(form.result.status) ? 'text-slate-900' : 'text-slate-300'}`}>
                                            {step.label}
                                        </p>
                                        {#if i === getStepIndex(form.result.status) && form.result.status !== 'selesai'}
                                            <p class="text-xs text-red-600 mt-1 font-medium animate-pulse">Sedang Berlangsung</p>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
      </section>
      </div>
    {/if}

    <!-- Service Catalog -->
    <section>
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row justify-between items-end mb-12 px-2">
        <div>
            {#if activeAgencyName === null}
              <h2 class="text-2xl font-bold text-slate-900 mb-2">Katalog Instansi</h2>
              <p class="text-slate-500">Pilih instansi untuk melihat layanan yang tersedia</p>
            {:else}
              <button 
                on:click={() => activeAgencyName = null} 
                class="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-full transition-colors mb-4"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Kembali ke Daftar Instansi
              </button>
              <h2 class="text-2xl font-bold text-slate-900 mb-2">{activeAgencyName}</h2>
              <p class="text-slate-500">Pilih layanan yang Anda butuhkan</p>
            {/if}
        </div>
        
        <!-- Search Bar -->
        <div class="w-full md:w-72 mt-6 md:mt-0 relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-slate-400 group-focus-within:text-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input 
              bind:value={searchQuery}
              on:input={() => {
                // Return to all view if searching
                if (searchQuery.trim().length > 0 && activeAgencyName !== null) {
                  activeAgencyName = null;
                }
              }}
              type="text" 
              placeholder="Cari layanan..." 
              class="w-full bg-slate-50 border-0 rounded-2xl pl-12 pr-4 py-3 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all shadow-sm group-hover:shadow-md"
            />
        </div>
      </div>

      <!-- Content Section -->
      <div class="space-y-12">
        {#if activeAgencyName === null && searchQuery.trim() === ''}
          <!-- Card View: Instansi -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each Object.entries(groupedLayanan) as [agencyName, services]}
              <button 
                on:click={() => activeAgencyName = agencyName}
                class="group relative bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl hover:border-red-100 hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-full overflow-hidden"
              >
                <!-- Decorative accent line -->
                <div class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-600 to-red-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                
                <div class="flex items-center gap-4 mb-6 relative z-10">
                  <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm border border-red-100">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-black text-slate-800 group-hover:text-red-700 transition-colors leading-tight">
                        {agencyName}
                    </h3>
                  </div>
                </div>
                
                <div class="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                    <span class="text-sm font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                      {services.length} Layanan
                    </span>
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <!-- Detail View: Layanan dari Specific Instansi OR search result -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {#each (activeAgencyName ? groupedLayanan[activeAgencyName] || [] : filteredLayanan) as lay (lay.id)}
              <button 
                on:click={() => selectedLayanan = lay}
                class="group relative bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-100 transition-all duration-300 text-left flex flex-col h-full overflow-hidden"
              >
                <!-- Decorative gradient on hover -->
                <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>

                <div class="flex items-start justify-between mb-6">
                    <div class="w-12 h-12 bg-slate-50 group-hover:bg-red-50 rounded-2xl flex items-center justify-center text-2xl text-slate-400 group-hover:text-red-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm border border-slate-100">
                        {lay.icon || '📁'}
                    </div>
                    <div class="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:border-red-200 group-hover:text-red-500 transition-colors bg-white">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                </div>
                
                <h3 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-red-700 transition-colors leading-tight">
                    {lay.name}
                </h3>
                
                <p class="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4 flex-grow">
                    Klik untuk melihat detail persyaratan dan mengajukan permohonan layanan.
                </p>
                
                {#if !activeAgencyName}
                  <div class="mb-4 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                    {lay.agencies?.name || 'Layanan Umum'}
                  </div>
                {/if}

                <div class="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-red-600 transition-colors uppercase tracking-wider">
                    <span>Lihat Persyaratan</span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      {#if filteredLayanan.length === 0}
        <div class="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <p class="text-slate-500 font-medium">Layanan tidak ditemukan</p>
            <button class="mt-4 text-red-600 text-sm hover:underline" on:click={() => searchQuery = ""}>Reset Pencarian</button>
        </div>
      {/if}
    </section>
  </main>

  <!-- Service Detail Modal -->
  {#if selectedLayanan}
    <div 
        role="button"
        tabindex="0"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
        transition:fade={{ duration: 200 }}
        on:click|self={() => selectedLayanan = null}
        on:keydown={(e) => e.key === 'Escape' && (selectedLayanan = null)}
    >
      <div 
        class="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col" 
        transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
      >
        <!-- Close Button -->
        <button 
            type="button"
            aria-label="Tutup"
            on:click={() => selectedLayanan = null}
            class="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div class="flex items-center gap-4 mb-6">
            <div class="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                {selectedLayanan.icon || '📁'}
            </div>
            <h2 class="text-xl font-bold text-slate-900 pr-8 leading-tight">{selectedLayanan.name}</h2>
        </div>
        
        <div class="flex-grow">
            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Persyaratan Dokumen</h3>
            <div class="space-y-3 mb-8">
            {#if selectedLayanan.requirements}
                {#each JSON.parse(selectedLayanan.requirements) as req}
                    <div class="flex items-start gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100">
                        <div class="mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span class="text-sm font-medium text-slate-700 leading-relaxed">{req}</span>
                    </div>
                {/each}
            {:else}
                <div class="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p class="text-slate-400 italic text-sm">Tidak ada persyaratan khusus untuk layanan ini.</p>
                </div>
            {/if}
            </div>
        </div>

        <div class="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 mt-auto">
            <button 
                on:click={() => selectedLayanan = null} 
                class="col-span-1 py-3.5 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors text-sm"
            >
                Batal
            </button>
            <a 
                href="/form/{selectedLayanan.id}" 
                class="col-span-2 bg-slate-900 hover:bg-red-700 text-white py-3.5 px-6 rounded-xl font-bold text-center transition-all shadow-lg hover:shadow-red-500/20 text-sm flex items-center justify-center gap-2"
            >
                <span>Ajukan Permohonan</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </a>
        </div>
      </div>
    </div>
  {/if}

  <Footer />

  <!-- WhatsApp Floating Button -->
  <a
    href="https://wa.me/6281123456789" 
    target="_blank"
    class="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#128c7e] text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center group"
    aria-label="Chat WhatsApp"
  >
    <!-- Tooltip -->
    <span class="absolute right-full mr-3 bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap border border-slate-100">
      Hubungi Kami
    </span>
    
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 relative z-10">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
    
    <!-- Pulse Effect -->
    <span class="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping"></span>
  </a>
</div>

<style>
  :global(body) 
  {
    background-color: #ffffff;
    overflow-x: hidden;
  }
</style>