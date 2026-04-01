<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { onMount } from 'svelte';
  import Footer from '$lib/components/Footer.svelte';

  let { data, form = null }: { data: PageData; form: ActionData | null } = $props();

  let isSubmitting = $state(false);
  let formValues = $state<Record<string, any>>({});
  let selectedDisplay = $state<Record<number, string>>({});
  let dateErrors = $state<Record<string, string>>({});
  let filePreviews = $state<Record<string, any>>({});
  let fileErrors = $state<Record<string, string>>({});
  let openSelectId = $state<number | null>(null);
  let selectSearch = $state<Record<number, string>>({});

  onMount(() => {
    // Populate form values from data.currentValues
    data.service.service_form_fields.forEach((field: any) => {
        const val = data.currentValues[field.id.toString()];
        if (val) {
            formValues[`field_${field.id}`] = val.value || '';
            if (field.type === 'select') {
                selectedDisplay[field.id] = val.value || '';
            }
        }
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (openSelectId !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('.searchable-select-container')) {
          openSelectId = null;
        }
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  });

  // Helpers
  function parseOptions(str: string | null): string[] {
    if (!str) return [];
    try { return JSON.parse(str); } catch { return str.split(',').map(o => o.trim()); }
  }

  function parseMeta(str: string | null): Record<string, any> {
    if (!str) return {};
    try { return JSON.parse(str); } catch { return {}; }
  }

  function getFileMaxSize(field: any): number {
    const meta = parseMeta(field.meta);
    return (meta.max_kb || 2048) * 1024;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function handleFileChange(event: Event, field: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const fieldKey = `field_${field.id}`;
    const maxSize = getFileMaxSize(field);

    delete fileErrors[fieldKey];

    if (!file) {
      delete filePreviews[fieldKey];
      return;
    }

    if (file.size > maxSize) {
      fileErrors[fieldKey] = `Ukuran file terlalu besar. Maksimal ${formatFileSize(maxSize)}.`;
      input.value = '';
      delete filePreviews[fieldKey];
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    filePreviews[fieldKey] = {
      name: file.name,
      size: file.size,
      url: (isImage || isPdf) ? URL.createObjectURL(file) : null,
      type: isImage ? 'image' : isPdf ? 'pdf' : 'other'
    };
  }

  function removeFile(field: any) {
    const fieldKey = `field_${field.id}`;
    if (filePreviews[fieldKey]?.url) URL.revokeObjectURL(filePreviews[fieldKey].url);
    delete filePreviews[fieldKey];
    const input = document.getElementById(fieldKey) as HTMLInputElement;
    if (input) input.value = '';
  }

  function getFilteredOptions(optionsStr: string | null, fieldId: number): string[] {
    const options = parseOptions(optionsStr);
    const search = selectSearch[fieldId]?.toLowerCase() || '';
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search));
  }

  function selectOption(fieldId: number, option: string) {
    selectedDisplay[fieldId] = option;
    formValues[`field_${fieldId}`] = option;
    openSelectId = null;
  }

  const getFieldError = (name: string) => (form as any)?.errors?.[name] || '';
</script>

<svelte:head>
  <title>Revisi Pengajuan {data.submission.tracking_code} — Layanan Digital APTIKA</title>
</svelte:head>

<div class="min-h-screen bg-slate-50/50 font-sans text-slate-900">
  <header class="relative bg-white border-b border-slate-100">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <a href="/" class="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-red-600 transition-colors mb-6 group">
        <svg class="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        <span>Beranda</span>
      </a>
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-slate-900 leading-tight">Perbaikan Pengajuan</h1>
          <p class="text-sm text-slate-400">ID: {data.submission.tracking_code}</p>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div class="bg-amber-50 rounded-2xl border border-amber-100 p-6 mb-8" transition:fade>
      <div class="flex items-center gap-3 mb-3 text-amber-800">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h2 class="text-sm font-bold uppercase tracking-wider">Catatan Admin</h2>
      </div>
      <p class="text-sm text-amber-700 leading-relaxed font-medium">"{data.submission.note || 'Mohon periksa kembali data Anda.'}"</p>
    </div>

    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <h2 class="text-lg font-bold text-slate-800">Formulir Revisi</h2>
        <p class="text-xs text-slate-400 mt-1">Lengkapi kolom yang membutuhkan perbaikan</p>
      </div>

      {#if form?.message}
        <div class="mx-6 mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
           <p class="text-sm text-red-700 font-medium">{form.message}</p>
        </div>
      {/if}

      <form method="POST" action="?/submit" enctype="multipart/form-data" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }} class="p-6 space-y-6">
        {#each data.service.service_form_fields as field (field.id)}
          <div class="space-y-2">
            <label for="field_{field.id}" class="text-sm font-bold text-slate-700">
              {field.label} {#if field.is_required}<span class="text-red-500">*</span>{/if}
            </label>

            {#if field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'numbertelp'}
              <input 
                id="field_{field.id}" name="field_{field.id}" type={field.type === 'numbertelp' ? 'tel' : field.type} 
                required={field.is_required} bind:value={formValues[`field_${field.id}`]}
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/10 focus:border-red-400 transition-all"
                class:border-red-400={getFieldError(`field_${field.id}`)}
              />

            {:else if field.type === 'select'}
              <div class="relative searchable-select-container">
                <input type="hidden" name="field_{field.id}" value={formValues[`field_${field.id}`] || ''} />
                <button type="button" onclick={() => openSelectId = openSelectId === field.id ? null : field.id} 
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-sm flex justify-between items-center">
                  <span class={selectedDisplay[field.id] ? 'text-slate-900 font-medium' : 'text-slate-400'}>{selectedDisplay[field.id] || 'Pilih...'}</span>
                  <svg class="w-4 h-4 text-slate-400 transition-transform" class:rotate-180={openSelectId === field.id} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {#if openSelectId === field.id}
                  <div class="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden" transition:fade>
                    <div class="p-2 bg-slate-50"><input type="text" bind:value={selectSearch[field.id]} placeholder="Cari..." class="w-full px-3 py-1.5 text-sm rounded-lg border-slate-200" onclick={e => e.stopPropagation()}/></div>
                    <div class="max-h-48 overflow-y-auto">
                      {#each getFilteredOptions(field.options, field.id) as opt}
                        <button type="button" onclick={() => selectOption(field.id, opt)} class="w-full px-4 py-2 text-sm text-left hover:bg-slate-50 {selectedDisplay[field.id] === opt ? 'bg-red-50 text-red-700 font-bold' : ''}">{opt}</button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

            {:else if field.type === 'file'}
              <div class="space-y-3">
                {#if data.currentValues[field.id.toString()]?.file_path && !filePreviews[`field_${field.id}`]}
                  <div class="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div class="flex-1 min-w-0"><span class="text-xs font-bold text-green-700 uppercase">File Saat Ini</span><a href={data.currentValues[field.id.toString()].file_path} target="_blank" class="block text-sm font-medium truncate text-green-800">{data.currentValues[field.id.toString()].file_path.split('/').pop()}</a></div>
                  </div>
                {/if}

                {#if !filePreviews[`field_${field.id}`]}
                  <label class="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-red-400 transition-colors">
                    <svg class="w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <span class="text-sm font-bold text-slate-600">Unggah File Baru</span>
                    <input id="field_{field.id}" name="field_{field.id}" type="file" class="sr-only" onchange={e => handleFileChange(e, field)}/>
                  </label>
                {/if}

                {#if filePreviews[`field_${field.id}`]}
                  <div class="p-3 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between" transition:fade>
                    <div class="flex items-center gap-3"><div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center"><svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div><div class="min-w-0"><p class="text-xs font-bold text-red-400 uppercase">File Baru</p><p class="text-sm font-bold text-red-700 truncate">{filePreviews[`field_${field.id}`].name}</p></div></div>
                    <button type="button" onclick={() => removeFile(field)} class="text-xs font-bold text-red-600 hover:underline">Batal</button>
                  </div>
                {/if}
              </div>
            {/if}

            {#if getFieldError(`field_${field.id}`)}
              <p class="text-xs text-red-500 font-medium">{getFieldError(`field_${field.id}`)}</p>
            {/if}
          </div>
        {/each}

        <div class="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center sm:text-left">* Wajib diisi</p>
          <div class="flex gap-3 w-full sm:w-auto">
             <button type="submit" disabled={isSubmitting} class="flex-1 sm:px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all disabled:opacity-50">
               {isSubmitting ? 'Mengirim...' : 'Kirim Perbaikan'}
             </button>
          </div>
        </div>
      </form>
    </div>
  </main>
  <Footer />
</div>

<style>
  :global(body) { background-color: #f8fafc; }
</style>
