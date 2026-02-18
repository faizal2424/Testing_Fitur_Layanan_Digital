<script lang="ts">
  import { fade, slide, fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  export let data: PageData;
  
  let ready = false;
  onMount(() => {
    ready = true;
  });

  const faqs = [
    { 
      q: "Apa itu Layanan Digital APTIKA?", 
      a: "Platform pelayanan publik satu pintu berbasis elektronik yang dikelola Dinas Komunikasi dan Informatika untuk mempermudah masyarakat dan instansi dalam permohonan layanan IT." 
    },
    { 
      q: "Siapa yang dapat menggunakan layanan ini?", 
      a: "Terbuka untuk seluruh Perangkat Daerah (OPD), Instansi Pemerintahan, dan Masyarakat umum yang membutuhkan dukungan fasilitas teknologi informasi sesuai katalog." 
    },
    { 
      q: "Apakah layanan ini dipungut biaya?", 
      a: "100% GRATIS. Seluruh layanan yang disediakan melalui platform ini tidak dipungut biaya apapun sebagai wujud pelayanan publik prima." 
    },
    { 
      q: "Berapa lama proses pengajuan layanan?", 
      a: "Layanan ringan (reset password/domain) ± 1x24 jam. Layanan kompleks (pengembangan aplikasi/server) menyesuaikan kajian teknis tim ahli kami." 
    }
  ];

  let openFaq = 0; 
  const toggleFaq = (i: number) => openFaq = openFaq === i ? -1 : i;
</script>

<svelte:head>
  <title>Tentang Kami — Layanan Digital APTIKA</title>
</svelte:head>

<div class="min-h-screen bg-white font-sans text-slate-900">

  <header class="relative pt-24 pb-20 px-4 overflow-hidden">
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

    <div class="absolute top-6 right-6 z-20">
        <a href="/" class="text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200 hover:ring-red-200 hover:shadow-md flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Beranda
        </a>
    </div>

    <div class="relative z-10 max-w-4xl mx-auto text-center" in:fade={{ duration: 800 }}>
      <div class="inline-flex items-center justify-center p-3 mb-8 bg-white/50 backdrop-blur-sm rounded-full shadow-sm ring-1 ring-slate-200">
          <span class="w-2 h-2 rounded-full bg-red-600 mr-3 animate-pulse"></span>
          <span class="text-sm font-semibold text-slate-600 tracking-wide uppercase">Tentang Kami</span>
      </div>
      
      <h1 class="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-slate-900">
        Mewujudkan Layanan Publik <br/>
        <span class="bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-slate-900">Cepat, Mudah & Transparan</span>
      </h1>
      
      <p class="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
        Platform terintegrasi untuk mendukung transformasi digital pemerintahan dan memberikan pengalaman pelayanan terbaik.
      </p>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-10 relative z-20 space-y-20">
    
    <section class="bg-white rounded-3xl p-8 md:p-12 ring-1 ring-slate-200 shadow-xl relative overflow-hidden" in:fly={{ y: 20, duration: 800, delay: 200 }}>
        <div class="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div class="grid md:grid-cols-2 gap-12 items-center relative z-10">
            <div class="space-y-6">
                <h2 class="text-3xl font-bold text-slate-900">Mengenal Layanan Digital APTIKA</h2>
                <p class="text-slate-600 text-lg leading-relaxed">
                    Website ini adalah portal resmi yang dikelola oleh <strong>Bidang Aplikasi Informatika (APTIKA)</strong> Dinas Komunikasi dan Informatika.
                </p>
                <p class="text-slate-500 leading-relaxed">
                    Kami hadir sebagai solusi satu pintu untuk menampung, memproses, dan memantau berbagai permohonan layanan teknologi informasi. Menghilangkan birokrasi manual yang lambat menjadi proses digital yang tercatat rapi.
                </p>
                
                <div class="flex gap-8 pt-4 border-t border-slate-100">
                    <div>
                        <span class="block text-3xl font-bold text-slate-900">{data.serviceCount}+</span>
                        <span class="text-sm text-slate-400 font-medium uppercase tracking-wider">Jenis Layanan</span>
                    </div>
                    <div>
                        <span class="block text-3xl font-bold text-slate-900">24/7</span>
                        <span class="text-sm text-slate-400 font-medium uppercase tracking-wider">Akses Sistem</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200">
                <h3 class="font-bold text-slate-900 mb-6 flex items-center gap-3 text-lg">
                    <span class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xl shadow-sm">🎯</span>
                    Fokus Utama Kami
                </h3>
                <ul class="space-y-4">
                    {#each [
                        "Menyederhanakan birokrasi pengajuan IT.", 
                        "Memberikan kepastian waktu (SLA).", 
                        "Transparansi status permohonan.",
                        "Arsip digital yang aman."
                    ] as item}
                    <li class="flex items-start gap-3">
                        <div class="mt-1 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">✓</div>
                        <span class="text-slate-600">{item}</span>
                    </li>
                    {/each}
                </ul>
            </div>
        </div>
    </section>

    <section>
        <div class="text-center mb-10">
             <h2 class="text-2xl font-bold text-slate-900">Visi & Misi</h2>
             <div class="w-16 h-1 bg-red-600 mx-auto mt-4 rounded-full"></div>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
            <div class="md:col-span-1 bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center min-h-[300px] shadow-lg group">
                <div class="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-0"></div>
                <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-red-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                
                <div class="relative z-10">
                    <span class="inline-block py-1 px-3 rounded-lg bg-white/10 backdrop-blur border border-white/10 text-xs font-bold uppercase tracking-widest mb-6">Visi</span>
                    <h3 class="text-xl font-medium leading-relaxed italic">
                        "Terwujudnya infrastruktur dan layanan digital yang integratif, inovatif, dan adaptif menuju Smart City."
                    </h3>
                </div>
            </div>

            <div class="md:col-span-2 grid sm:grid-cols-2 gap-4">
                {#each [
                    { t: "Infrastruktur Handal", d: "Mengembangkan jaringan TIK yang aman dan stabil.", i: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
                    { t: "SDM Berkualitas", d: "Meningkatkan kompetensi teknis sumber daya manusia.", i: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" },
                    { t: "Informasi Akurat", d: "Menjamin ketersediaan informasi publik yang valid.", i: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                    { t: "Inovasi Digital", d: "Mendorong digitalisasi di setiap sektor pelayanan.", i: "M13 10V3L4 14h7v7l9-11h-7z" }
                ] as misi}
                <div class="bg-white p-6 rounded-3xl ring-1 ring-slate-100 hover:ring-red-200 hover:shadow-lg transition-all group">
                    <div class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors mb-4">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={misi.i} /></svg>
                    </div>
                    <h4 class="font-bold text-slate-900">{misi.t}</h4>
                    <p class="text-sm text-slate-500 mt-1">{misi.d}</p>
                </div>
                {/each}
            </div>
        </div>
    </section>

    <section class="py-12 border-y border-slate-100 relative overflow-hidden">
        <div class="absolute inset-0 bg-slate-50/50 -z-10"></div>
        
        <div class="text-center mb-12">
            <h2 class="text-2xl font-bold text-slate-900">Alur Layanan</h2>
            <p class="text-slate-500 mt-2">Proses sederhana untuk hasil maksimal</p>
        </div>

        <div class="relative grid grid-cols-1 md:grid-cols-4 gap-8">
             <div class="hidden md:block absolute top-8 left-10 right-10 h-0.5 bg-gradient-to-r from-slate-200 via-red-200 to-slate-200"></div>

             {#each [
                { t: "Pilih Layanan", i: "1" }, { t: "Isi Formulir", i: "2" }, { t: "Verifikasi", i: "3" }, { t: "Selesai", i: "4" }
             ] as flow, idx}
             <div class="relative flex flex-col items-center text-center group z-10">
                 <div class="w-16 h-16 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm flex items-center justify-center mb-4 group-hover:ring-red-200 group-hover:scale-110 transition-all duration-300">
                     <span class="text-xl font-bold text-slate-300 group-hover:text-red-600 transition-colors">{flow.i}</span>
                 </div>
                 <h4 class="font-bold text-slate-900 group-hover:text-red-700 transition-colors">{flow.t}</h4>
             </div>
             {/each}
        </div>
    </section>

    <section class="grid md:grid-cols-3 gap-10">
        <div class="md:col-span-1">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Pertanyaan Umum</h2>
            <p class="text-slate-500 mb-6 text-sm leading-relaxed">
              Temukan jawaban cepat untuk pertanyaan yang sering diajukan. Jika butuh bantuan lebih lanjut, hubungi kami.
            </p>
            
            <a href="mailto:helpdesk@semarangkota.go.id" class="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-3 rounded-xl transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Hubungi Helpdesk
            </a>
        </div>

        <div class="md:col-span-2 space-y-4">
            {#each faqs as faq, i}
                <div class="bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md">
                  <button 
                    class="w-full text-left p-6 flex justify-between items-center gap-4"
                    on:click={() => toggleFaq(i)}
                  >
                      <span class={`font-bold transition-colors ${openFaq === i ? 'text-red-600' : 'text-slate-800'}`}>{faq.q}</span>
                      <div class={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${openFaq === i ? 'rotate-180 bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                         <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                         </svg>
                      </div>
                  </button>
                  {#if openFaq === i}
                      <div class="px-6 pb-6 pt-0 text-slate-500 text-sm leading-relaxed" transition:slide={{ duration: 300 }}>
                          {faq.a}
                      </div>
                  {/if}
                </div>
            {/each}
        </div>
    </section>

  </main>

  <footer class="mt-20 border-t border-slate-100 py-10 bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 text-center">
        <p class="text-slate-400 text-sm">© 2026 Dinas Komunikasi dan Informatika. All rights reserved.</p>
      </div>
  </footer>

</div>

<style>
  :global(body) {
    background-color: #ffffff;
    overflow-x: hidden;
  }
</style>