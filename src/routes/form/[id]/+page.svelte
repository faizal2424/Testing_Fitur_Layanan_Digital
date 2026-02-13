<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { enhance } from '$app/forms';
  import { cubicOut } from 'svelte/easing';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let isSubmitting = false;

  // Parse requirements safely
  $: requirements = (() => {
    try {
      return data.service.requirements ? JSON.parse(data.service.requirements) : [];
    } catch {
      return [];
    }
  })();

  // Parse options for select/radio fields
  function parseOptions(optionsStr: string | null): string[] {
    if (!optionsStr) return [];
    try {
      return JSON.parse(optionsStr);
    } catch {
      return optionsStr.split(',').map((o: string) => o.trim());
    }
  }

  // Parse meta JSON field safely
  function parseMeta(metaStr: string | null): Record<string, any> {
    if (!metaStr) return {};
    try {
      return JSON.parse(metaStr);
    } catch {
      return {};
    }
  }

  // Get min date for date fields based on date_mode in meta
  function getDateMin(field: any): string | null {
    const meta = parseMeta(field.meta);
    const mode = meta.date_mode ?? 'free';
    if (mode === 'future') {
      return new Date().toISOString().slice(0, 10);
    }
    return null;
  }

  // Track client-side date validation errors
  let dateErrors: Record<string, string> = {};

  function handleDateChange(event: Event, field: any) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const fieldKey = `field_${field.id}`;
    const minDate = getDateMin(field);

    if (minDate && value && value < minDate) {
      dateErrors[fieldKey] = 'Tanggal tidak boleh sebelum hari ini';
      dateErrors = dateErrors; // trigger reactivity
    } else {
      delete dateErrors[fieldKey];
      dateErrors = dateErrors; // trigger reactivity
    }
  }

  // Handle number input validation
  function handleNumberKeyDown(event: KeyboardEvent) {
    // Allow: backspace, delete, tab, escape, enter
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(event.key) || 
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Command+A, etc.
        (event.ctrlKey === true || event.metaKey === true)) {
      return;
    }
    // Prevent if not a number
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  function handleNumberPaste(event: ClipboardEvent) {
    const pastedData = event.clipboardData?.getData('text');
    if (pastedData && !/^\d+$/.test(pastedData)) {
      event.preventDefault();
    }
  }

  // ── File upload state & helpers ──
  let filePreviews: Record<string, { name: string; size: number; url: string | null; type: 'image' | 'pdf' | 'other' }> = {};
  let fileErrors: Record<string, string> = {};
  let fileInputs: Record<string, HTMLInputElement> = {};

  // Get accepted file types from meta.mimes (e.g. "pdf,jpg,jpeg,png"), convert to HTML accept format
  function getFileAccept(field: any): string {
    const meta = parseMeta(field.meta);
    const mimes = meta.mimes || 'pdf,jpg,jpeg,png';
    return mimes.split(',').map((m: string) => '.' + m.trim()).join(',');
  }

  // Get max file size in bytes from meta.max_kb (stored in KB), default 2048 KB = 2MB
  function getFileMaxSize(field: any): number {
    const meta = parseMeta(field.meta);
    const maxKb = meta.max_kb || 2048;
    return maxKb * 1024; // convert KB to bytes
  }

  // Human-readable file size
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // Friendly accept string for display, e.g. "pdf,jpg" → "PDF, JPG"
  function getAcceptDisplay(field: any): string {
    const meta = parseMeta(field.meta);
    const mimes = meta.mimes || 'pdf,jpg,jpeg,png';
    return mimes.split(',').map((m: string) => m.trim().toUpperCase()).join(', ');
  }

  function handleFileChange(event: Event, field: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const fieldKey = `field_${field.id}`;
    const maxSize = getFileMaxSize(field);

    // Clear previous state
    delete fileErrors[fieldKey];

    if (!file) {
      delete filePreviews[fieldKey];
      filePreviews = filePreviews;
      fileErrors = fileErrors;
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      fileErrors[fieldKey] = `Ukuran file terlalu besar. Maksimal ${formatFileSize(maxSize)}.`;
      fileErrors = fileErrors;
      // Clear file input
      input.value = '';
      delete filePreviews[fieldKey];
      filePreviews = filePreviews;
      return;
    }

    // Build preview
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const previewUrl = (isImage || isPdf) ? URL.createObjectURL(file) : null;

    filePreviews[fieldKey] = {
      name: file.name,
      size: file.size,
      url: previewUrl,
      type: isImage ? 'image' : isPdf ? 'pdf' : 'other'
    };
    filePreviews = filePreviews;
    fileErrors = fileErrors;
  }

  function removeFile(field: any) {
    const fieldKey = `field_${field.id}`;

    // Revoke object URL to avoid memory leak
    if (filePreviews[fieldKey]?.url) {
      URL.revokeObjectURL(filePreviews[fieldKey].url!);
    }

    delete filePreviews[fieldKey];
    delete fileErrors[fieldKey];
    filePreviews = filePreviews;
    fileErrors = fileErrors;

    // Reset native input
    const input = fileInputs[fieldKey];
    if (input) input.value = '';
  }

  function getFieldError(fieldName: string): string {
    const f = form as any;
    if (!f?.errors) return '';
    return f.errors[fieldName] || '';
  }
</script>

<svelte:head>
  <title>Formulir {data.service.name} — Layanan Digital APTIKA</title>
</svelte:head>

<div class="min-h-screen bg-slate-50/50 font-sans text-slate-900">

  <!-- Header -->
  <header class="relative bg-white border-b border-slate-100">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <a 
        href="/"
        class="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-red-600 transition-colors mb-6 group"
      >
        <svg class="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Kembali ke Beranda</span>
      </a>

      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
          {data.service.icon || '📁'}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-slate-900 leading-tight">
            {data.service.name}
          </h1>
          <p class="text-sm text-slate-400 mt-1">Formulir Pengajuan Layanan</p>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    
    <!-- Requirements Card -->
    {#if requirements.length > 0}
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8" transition:fade>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Persyaratan Dokumen</h2>
        </div>
        <div class="grid gap-2">
          {#each requirements as req, i}
            <div class="flex items-start gap-3 py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-50 hover:border-slate-200 transition-colors">
              <div class="mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span class="text-sm font-medium text-slate-600">{req}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Form Card -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      
      <!-- Form Header -->
      <div class="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <h2 class="text-lg font-bold text-slate-800">Isi Formulir Pengajuan</h2>
        <p class="text-sm text-slate-400 mt-1">Lengkapi data berikut untuk mengajukan permohonan</p>
      </div>

      <!-- Error Banner -->
      {#if form?.message}
        <div class="mx-6 mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3" transition:fly={{ y: -10, duration: 200 }}>
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-red-700 font-medium">{form.message}</p>
        </div>
      {/if}

      <form 
        method="POST"
        action="?/submit"
        enctype="multipart/form-data"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
          };
        }}
        class="p-6 space-y-6"
      >
        
        <!-- Dynamic Form Fields -->
        {#if data.service.service_form_fields.length > 0}
          <div>
            <div class="space-y-5">
              {#each data.service.service_form_fields as field (field.id)}
                <div class="group">
                  <label for="field_{field.id}" class="block text-sm font-semibold text-slate-700 mb-2">
                    {field.label}
                    {#if field.is_required}
                      <span class="text-red-500">*</span>
                    {/if}
                  </label>

                  <!-- Text Input -->
                  {#if field.type === 'text'}
                    <input
                      id="field_{field.id}"
                      name="field_{field.id}"
                      type="text"
                      required={field.is_required}
                      placeholder={field.placeholder || ''}
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 
                        focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all text-sm"
                      class:border-red-300={getFieldError(`field_${field.id}`)}
                    />

                  <!-- Email Input -->
                  {:else if field.type === 'email'}
                    <input
                      id="field_{field.id}"
                      name="field_{field.id}"
                      type="email"
                      required={field.is_required}
                      placeholder={field.placeholder || 'contoh@email.com'}
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 
                        focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all text-sm"
                      class:border-red-300={getFieldError(`field_${field.id}`)}
                    />

                  <!-- Number Input -->
                  {:else if field.type === 'number'}
                    <input
                      id="field_{field.id}"
                      name="field_{field.id}"
                      type="number"
                      required={field.is_required}
                      placeholder={field.placeholder || ''}
                      on:keydown={handleNumberKeyDown}
                      on:paste={handleNumberPaste}
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 
                        focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      class:border-red-300={getFieldError(`field_${field.id}`)}
                    />

                  <!-- Date Input -->
                  {:else if field.type === 'date'}
                    <input
                      id="field_{field.id}"
                      name="field_{field.id}"
                      type="date"
                      required={field.is_required}
                      placeholder={field.placeholder || ''}
                      min={getDateMin(field) || undefined}
                      on:change={(e) => handleDateChange(e, field)}
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 
                        focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all text-sm"
                      class:border-red-300={getFieldError(`field_${field.id}`) || dateErrors[`field_${field.id}`]}
                    />
                    {#if dateErrors[`field_${field.id}`]}
                      <p class="mt-1.5 text-xs text-red-500 font-medium">{dateErrors[`field_${field.id}`]}</p>
                    {/if}

                  <!-- Textarea -->
                  {:else if field.type === 'textarea'}
                    <textarea
                      id="field_{field.id}"
                      name="field_{field.id}"
                      required={field.is_required}
                      placeholder={field.placeholder || ''}
                      rows="4"
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 
                        focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all text-sm resize-y"
                      class:border-red-300={getFieldError(`field_${field.id}`)}
                    ></textarea>

                  <!-- Select -->
                  {:else if field.type === 'select'}
                    <select
                      id="field_{field.id}"
                      name="field_{field.id}"
                      required={field.is_required}
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 
                        focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all text-sm appearance-none"
                      class:border-red-300={getFieldError(`field_${field.id}`)}
                    >
                      <option value="">— Pilih —</option>
                      {#each parseOptions(field.options) as opt}
                        <option value={opt}>{opt}</option>
                      {/each}
                    </select>

                  <!-- Radio -->
                  {:else if field.type === 'radio'}
                    <div class="flex flex-wrap gap-3 mt-1">
                      {#each parseOptions(field.options) as opt, i}
                        <label 
                          class="relative flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer 
                            hover:border-red-200 hover:bg-red-50/30 transition-all text-sm has-[:checked]:bg-red-50 has-[:checked]:border-red-300 has-[:checked]:text-red-700"
                        >
                          <input
                            type="radio"
                            name="field_{field.id}"
                            value={opt}
                            required={field.is_required && i === 0}
                            class="text-red-600 focus:ring-red-500/20 border-slate-300"
                          />
                          <span class="font-medium">{opt}</span>
                        </label>
                      {/each}
                    </div>

                  <!-- File Upload -->
                  {:else if field.type === 'file'}
                    <div class="relative">
                      <!-- Upload dropzone (hidden when file is selected) -->
                      {#if !filePreviews[`field_${field.id}`]}
                        <label
                          for="field_{field.id}"
                          class="flex flex-col items-center justify-center w-full py-8 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer 
                            hover:border-red-300 hover:bg-red-50/20 transition-all group/upload"
                          class:border-red-300={getFieldError(`field_${field.id}`) || fileErrors[`field_${field.id}`]}
                        >
                          <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover/upload:shadow-md transition-shadow">
                            <svg class="w-6 h-6 text-slate-400 group-hover/upload:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <span class="text-sm font-semibold text-slate-600 group-hover/upload:text-red-600 transition-colors">
                            Klik untuk mengunggah file
                          </span>
                          <span class="text-xs text-slate-400 mt-1">
                            {getAcceptDisplay(field)} (maks. {formatFileSize(getFileMaxSize(field))})
                          </span>
                        </label>
                      {/if}

                      <input
                        id="field_{field.id}"
                        name="field_{field.id}"
                        type="file"
                        required={field.is_required && !filePreviews[`field_${field.id}`]}
                        accept={getFileAccept(field)}
                        on:change={(e) => handleFileChange(e, field)}
                        bind:this={fileInputs[`field_${field.id}`]}
                        class="sr-only"
                      />

                      <!-- File Preview -->
                      {#if filePreviews[`field_${field.id}`]}
                        <div class="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden" transition:fly={{ y: 8, duration: 200 }}>
                          <!-- PDF Preview -->
                          {#if filePreviews[`field_${field.id}`].type === 'pdf' && filePreviews[`field_${field.id}`].url}
                            <div class="w-full border-b border-slate-200">
                              <object
                                data={filePreviews[`field_${field.id}`].url}
                                type="application/pdf"
                                title="Preview PDF"
                                class="w-full h-[280px]"
                              >
                                <p class="p-4 text-sm text-slate-500 text-center">Preview PDF tidak tersedia di browser ini.
                                  <a href={filePreviews[`field_${field.id}`].url} target="_blank" rel="noopener" class="text-red-600 underline">Buka PDF</a>
                                </p>
                              </object>
                            </div>
                          {/if}

                          <div class="flex items-center gap-4 p-4">
                          <!-- Thumbnail or file icon -->
                          {#if filePreviews[`field_${field.id}`].type === 'image' && filePreviews[`field_${field.id}`].url}
                            <img
                              src={filePreviews[`field_${field.id}`].url}
                              alt="Preview"
                              class="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                            />
                          {:else if filePreviews[`field_${field.id}`].type === 'pdf'}
                            <div class="w-16 h-16 bg-red-50 rounded-lg border border-red-100 flex items-center justify-center flex-shrink-0">
                              <svg class="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          {:else}
                            <div class="w-16 h-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          {/if}

                          <!-- File info -->
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-slate-700 truncate">
                              {filePreviews[`field_${field.id}`].name}
                            </p>
                            <p class="text-xs text-slate-400 mt-0.5">
                              {formatFileSize(filePreviews[`field_${field.id}`].size)}
                            </p>
                          </div>

                          <!-- Remove button -->
                          <button
                            type="button"
                            on:click={() => removeFile(field)}
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-red-600 
                              hover:bg-red-50 hover:border-red-200 transition-all flex-shrink-0"
                          >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus
                          </button>
                          </div>
                        </div>
                      {/if}

                      <!-- File size error -->
                      {#if fileErrors[`field_${field.id}`]}
                        <p class="mt-1.5 text-xs text-red-500 font-medium" transition:fly={{ y: -4, duration: 150 }}>
                          {fileErrors[`field_${field.id}`]}
                        </p>
                      {/if}

                      <!-- Info note -->
                      <p class="mt-1.5 text-xs text-slate-400">
                        Maksimal ukuran file {formatFileSize(getFileMaxSize(field))}.
                      </p>
                    </div>

                  <!-- Default: text -->
                  {:else}
                    <input
                      id="field_{field.id}"
                      name="field_{field.id}"
                      type="text"
                      required={field.is_required}
                      placeholder={field.placeholder || ''}
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 
                        focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all text-sm"
                      class:border-red-300={getFieldError(`field_${field.id}`)}
                    />
                  {/if}

                  <!-- Help Text -->
                  {#if field.help_text}
                    <p class="mt-1.5 text-xs text-slate-400">{field.help_text}</p>
                  {/if}

                  <!-- Field Error -->
                  {#if getFieldError(`field_${field.id}`)}
                    <p class="mt-1.5 text-xs text-red-500 font-medium">{getFieldError(`field_${field.id}`)}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="py-10 text-center">
            <p class="text-slate-400 text-sm">Tidak ada field formulir untuk layanan ini.</p>
          </div>
        {/if}

        <!-- Submit Section -->
        <div class="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-xs text-slate-400 order-2 sm:order-1">
            <span class="text-red-500">*</span> Menandakan field wajib diisi
          </p>
          
          <div class="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
            <a 
              href="/"
              class="py-3 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors text-sm text-center"
            >
              Batal
            </a>
            <button
              type="submit"
              disabled={isSubmitting}
              class="flex-1 sm:flex-initial bg-slate-900 hover:bg-red-700 text-white py-3 px-8 rounded-xl font-bold 
                transition-all shadow-lg hover:shadow-red-500/20 text-sm flex items-center justify-center gap-2 
                disabled:opacity-60 disabled:cursor-not-allowed min-w-[180px]"
            >
              {#if isSubmitting}
                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Mengirim...</span>
              {:else}
                <span>Ajukan Permohonan</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              {/if}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Footer note -->
    <div class="mt-8 text-center">
      <p class="text-xs text-slate-400">
        Setelah pengajuan, Anda akan menerima kode tracking untuk memantau status permohonan.
      </p>
    </div>
  </main>
</div>

<style>
  :global(body) {
    background-color: #f8fafc;
  }
</style>
