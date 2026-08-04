# Desain Sistem Notifikasi Email — Alur Pengajuan 3 Peran

**Tanggal:** 2026-08-04
**Status:** Rekomendasi final (menunggu implementasi)
**Stack target:** SvelteKit + Prisma + MariaDB + nodemailer + queue tabel `jobs`

---

## 1. Profil Kebutuhan (Hasil Klarifikasi)

| Dimensi | Jawaban | Implikasi Desain |
|---|---|---|
| Volume | < 10 pengajuan/hari (rendah) | Real-time email tetap layak; risiko spam/fatigue rendah |
| SLA | Tidak ada | Tidak perlu reminder/eskalasi otomatis berbasis waktu |
| Urgensi | Semua sama penting | Tidak perlu tier prioritas email; flag `is_priority` cukup untuk highlight subjek jika volume naik |
| Admin | Visibilitas penuh | Semua perubahan status tetap masuk **notifikasi in-app**; email hanya untuk event yang butuh **aksi Admin** |
| PIC | Aktif di dashboard | Email PIC hanya untuk event yang **mengubah ownership** (penugasan baru); status lanjutan cukup in-app |

**Kesimpulan utama:**
Karena volume rendah dan tidak ada SLA, **tidak perlu digest harian**. Strategi terbaik adalah **real-time email untuk event "actionable" atau "keputusan final" saja**, dan **in-app notification untuk status transisi/informatif**. Ini memenuhi keinginan Admin "visibilitas penuh" (via dashboard) tanpa membuat inbox penuh.

---

## 2. Riset Best Practice (Ringkasan)

Pola dari sistem ticketing & workflow (Jira, ServiceNow, Asana, Freshdesk):

1. **Assign-mentality** — email dikirim ke *assignee* (pemilik tugas), bukan ke semua orang. Perubahan status hanya melaporkan; perubahan *ownership* butuh notifikasi langsung.
2. **Actionable vs Informational** — email wajib mendorong aksi (verifikasi, setujui, lengkapi, proses). Informasi pasif cukup di dashboard/in-app.
3. **Anti-notification-fatigue**:
   - *Principle of Least Notification*: kirim ke penerima paling sedikit yang masih membuat alur berjalan.
   - *Role-based routing*: assignee dapat email real-time; watcher (admin) cukup in-app / digest.
   - *Dedup & merge*: 1 email gabungan lebih baik daripada 3 email terpisah untuk 1 pengajuan.
   - *Preferensi & suppression*: pengguna bisa memilih, email bounce ditekan.
4. **Real-time vs Digest** — digest dipakai saat volume tinggi atau traffic di luar jam kerja. Untuk volume <10/hari, digest menambah latensi tanpa manfaat berarti.

---

## 3. Matriks Event-Trigger vs Penerima

Legend: ✅ = Email (real-time) · 🔵 = Notifikasi in-app · — = Tidak dikirim

| # | Event / Trigger | Pengaju | Admin | PIC | Mode & Keputusan |
|---|---|---|---|---|---|
| E1 | Pengajuan baru masuk (form submit) | ✅ | ✅ | — | **Real-time** |
| E2 | Ditugaskan ke PIC (status `ditugaskan`) | 🔵 | 🔵 | ✅ + 🔵 | **Real-time (PIC)** |
| E3 | PIC mulai proses (`diproses_pic`) | — | 🔵 | 🔵 | **In-app saja** |
| E4 | PIC selesai (`diselesaikan_pic`) | — | ✅ + 🔵 | 🔵 | **Real-time (Admin)** |
| E5 | Selesai final (`selesai`) | ✅ + 🔵 | 🔵 | 🔵 | **Real-time (Pengaju)** |
| E6 | Revisi diminta (`revisi`) | ✅ + 🔵 | 🔵 | — | **Real-time (Pengaju)** |
| E7 | Ditolak PIC (`ditolak_pic`) | — | ✅ + 🔵 | 🔵 | **Real-time (Admin)** |
| E8 | Pengajuan ditolak (`ditolak_pengajuan`) | ✅ + 🔵 | 🔵 | — | **Real-time (Pengaju)** |
| E9 | Dokumen kurang | ✅ | 🔵 | — | **Real-time (Pengaju)** |

**Ringkasan email yang dikirim (maksimum per pengajuan):**
- Pengaju: E1 (konfirmasi) → E6/E9 (jika revisi) → E5/E8 (hasil final) = maks **3 email**
- Admin: E1 (verifikasi) → E4 (validasi final) → E7 (assign ulang, hanya jika ditolak PIC) = maks **3 email**
- PIC: E2 (penugasan) = **1 email** per pengajuan

---

## 4. Justifikasi Setiap Keputusan

### E1 — Pengajuan baru → Email ke Pengaju & Admin (Real-time)
- **Actionable?** Ya. Admin harus verifikasi & menugaskan; Pengaju perlu bukti resmi pengajuannya diterima (tracking code).
- **Bisa digabung?** Tidak ideal — ini titik awal alur, menunda konfirmasi ke pengaju merusak kepercayaan.
- **Risiko jika tidak real-time?** Pengaju tidak punya bukti kirim; Admin tidak tahu ada antrean baru.
- **Keputusan:** Real-time, email ke kedua pihak. (Sudah berjalan di `form/[id]/+page.server.ts` — dipertahankan.)

### E2 — Ditugaskan ke PIC → Email ke PIC (Real-time)
- **Actionable?** Ya. PIC mendapat tanggung jawab baru; ini perubahan **ownership** yang paling mudah terlewat dari dashboard.
- **Bisa digabung?** Tidak dengan event lain — penugasan jarang berbarengan.
- **Risiko jika tidak real-time?** Pengajuan tertunda karena PIC tidak tahu ditugaskan (walaupun aktif dashboard, email adalah jaring pengaman).
- **Keputusan:** Real-time email ke PIC + in-app. Pengaju **tidak** dapat email (informasi "sedang diproses" ada di halaman tracking; tidak actionable).

### E3 — PIC mulai proses → In-app saja
- **Actionable?** Tidak untuk siapa pun. Ini status internal.
- **Bisa digabung?** Bisa, tapi informasinya tidak perlu.
- **Risiko jika tidak real-time?** Tidak ada. Admin tetap melihatnya di dashboard (visibilitas penuh via in-app).
- **Keputusan:** **Tanpa email** — hanya notifikasi in-app (ke Admin & PIC). *Ini penghemat email terbesar di alur Anda.*

### E4 — PIC selesai → Email ke Admin (Real-time)
- **Actionable?** Ya. Admin harus memvalidasi hasil & menindaklanjuti ke `selesai`.
- **Bisa digabung?** Tidak, event ini menandai akhir tahap PIC.
- **Risiko jika tidak real-time?** Hasil PIC menganggur; pengaju menunggu lebih lama.
- **Keputusan:** Real-time email ke Admin + in-app. Pengaju **tidak** dapat email (hasil final belum tentu disetujui; hindari email ganda E4+E5).

### E5 — Selesai final → Email ke Pengaju (Real-time)
- **Actionable?** Keputusan final yang mengubah hak penerima (pengajuan selesai/ditolak). Wajib ada jejak resmi.
- **Bisa digabung?** Tidak — ini titik akhir alur.
- **Risiko jika tidak real-time?** Pengaju tidak tahu hasilnya; harus mengecek manual.
- **Keputusan:** Real-time email ke Pengaju + in-app. Admin cukup in-app (mereka yang mengeksekusi, pasti tahu).

### E6 — Revisi diminta → Email ke Pengaju (Real-time)
- **Actionable?** Sangat. Pengaju harus melengkapi/memperbaiki. Tanpa email, pengajuan bisa menggantung tanpa batas (dan tidak ada SLA untuk memaksanya).
- **Bisa digabung?** Tidak.
- **Risiko jika tidak real-time?** Pengajuan stuck di status `revisi` tanpa aksi.
- **Keputusan:** Real-time email ke Pengaju + in-app.

### E7 — Ditolak PIC → Email ke Admin (Real-time)
- **Actionable?** Ya. Admin harus memutuskan: assign ulang, revisi, atau tolak.
- **Bisa digabung?** Tidak.
- **Risiko jika tidak real-time?** Pengajuan menggantung di status `ditolak_pic`.
- **Keputusan:** Real-time email ke Admin + in-app. PIC tidak perlu email (dia yang menolak).

### E8 — Pengajuan ditolak → Email ke Pengaju (Real-time)
- **Actionable?** Keputusan final penolakan — wajib dikomunikasikan resmi.
- **Keputusan:** Real-time email ke Pengaju + in-app. Admin cukup in-app.

### E9 — Dokumen kurang → Email ke Pengaju (Real-time)
- **Actionable?** Ya, pengaju harus mengunggah dokumen.
- **Keputusan:** Real-time email ke Pengaju (template `documentReminderTemplate` sudah ada).

---

## 5. Template Subjek & Isi Email

Semua email menggunakan layout `wrapLayout()` yang sudah ada di `src/lib/server/email-templates.ts` (brand bar, card, status badge, tombol CTA).

### T-E1a: Konfirmasi Pengajuan Diterima → Pengaju *(sudah ada: `submissionReceivedTemplate`)*
- **Subjek:** `Permohonan Diterima — {nama layanan} ({kode})`
- **Isi:** Sapaan → "Permohonan Anda untuk {layanan} telah kami terima dan sedang dalam antrian verifikasi." → Info block kode pelacakan → CTA "Lacak Status Permohonan" → catatan proses.

### T-E1b: Ada Pengajuan Baru → Admin *(baru)*
- **Subjek:** `[Verifikasi] Pengajuan Baru — {nama layanan} oleh {nama} ({kode})`
- **Isi:** "Halo Admin, pengajuan baru menunggu verifikasi Anda." → Info block: layanan, nama pengaju, tanggal, prioritas (jika `is_priority`, tampilkan badge "Prioritas") → CTA "Verifikasi & Tugaskan" → link detail `/admin/pengajuan/{id}`.

### T-E2: Penugasan ke PIC → PIC *(baru)*
- **Subjek:** `[Tugas Baru] {nama layanan} — {kode}`
- **Isi:** "Halo {nama PIC}, Anda ditugaskan menangani pengajuan berikut." → Info block: kode, layanan, nama pengaju → CTA "Lihat & Proses" → catatan dari Admin (jika ada) → tombol "Mulai Proses".
- **Penting:** subjek diawali `[Tugas Baru]` agar PIC bisa memfilter email actionable.

### T-E4: Validasi Hasil PIC → Admin *(baru)*
- **Subjek:** `[Validasi] PIC Menyelesaikan — {layanan} ({kode})`
- **Isi:** "Halo Admin, PIC {nama PIC} telah menyelesaikan pengajuan {kode} dan menunggu validasi final Anda." → Info block: layanan, PIC, tanggal selesai → CTA "Validasi & Selesaikan".

### T-E5: Hasil Akhir → Pengaju *(baru; bisa pakai `statusUpdateTemplate` jika sudah ada)*
- **Subjek (selesai):** `Permohonan Selesai — {layanan} ({kode})`
- **Subjek (ditolak):** `Permohonan Ditangguhkan — {layanan} ({kode})`
- **Isi:** "Halo {nama}, status permohonan Anda untuk {layanan} kini **{status}**." → Status badge → Notes (alasan/catatan) → CTA "Lihat Detail" → CTA unduh Surat Bukti (link `/api/surat-bukti/{code}` jika tersedia).

### T-E6: Permintaan Revisi → Pengaju *(baru)*
- **Subjek:** `[Perlu Tindakan] Permohonan Perlu Revisi — {layanan} ({kode})`
- **Isi:** "Halo {nama}, permohonan Anda memerlukan perbaikan sebelum dilanjutkan." → Notes: catatan revisi dari Admin → CTA "Perbaiki Pengajuan" → batas waktu hisapan (jika ada; tanpa SLA cukup "sesegera mungkin").

### T-E7: Ditolak PIC → Admin *(baru)*
- **Subjek:** `[Perlu Tindakan] Pengajuan Ditolak PIC — {layanan} ({kode})`
- **Isi:** "Halo Admin, PIC {nama PIC} menolak pengajuan {kode}. Silakan tugaskan ulang, minta revisi, atau tangguhkan pengajuan." → Notes alasan PIC → CTA "Tindak Lanjuti".

### T-E8: Penolakan Final → Pengaju *(baru)*
- **Subjek:** `Keputusan Permohonan — {layanan} ({kode})`
- **Isi:** "Halo {nama}, kami mohon maaf, permohonan Anda untuk {layanan} **tidak dapat diproses**." → Notes alasan → info kontak.

### T-E9: Dokumen Kurang → Pengaju *(sudah ada: `documentReminderTemplate`)*
- **Subjek:** `[Perlu Tindakan] Dokumen Belum Lengkap — {layanan} ({kode})`
- **Isi:** Daftar dokumen yang kurang → CTA hubungi kantor.

**Konvensi subjek (penting untuk filter Gmail & anti-fatigue):**
- `[Tugas Baru]` / `[Perlu Tindakan]` / `[Validasi]` / `[Verifikasi]` → **actionable untuk penerima**
- tanpa prefix → **informasi final/keputusan** (dibuka karena penting)

---

## 6. Mekanisme Anti-Duplikasi & Anti-Spam

### 6.1 Idempotency / Dedup (paling penting)
Worker memproses dengan retry (max 3x). Tanpa dedup, retry bisa mengirim email ganda.
- Tambah tabel `email_logs`:
  ```
  id BIGINT PK
  submission_id BIGINT (nullable utk non-pengajuan)
  event_type VARCHAR(50)      -- 'submission_received' | 'assigned_to_pic' | ...
  recipient_email VARCHAR(255)
  recipient_role VARCHAR(20)   -- 'applicant' | 'admin' | 'pic'
  subject VARCHAR(255)
  status ENUM('sent','failed','suppressed')
  created_at DATETIME
  UNIQUE KEY uq_dedup (submission_id, event_type, recipient_role, recipient_email)
  ```
- Alur: **sebelum dispatch** maupun **sebelum sendMail di worker**, query `email_logs` dengan key unik. Jika `status='sent'` → skip. Jika `status='failed'` → boleh dikirim ulang oleh retry worker (update status, bukan insert baru).
- Implementasi paling aman: cek di worker (dekat `sendMail`) agar retry tidak duplikat, PLUS cek pada saat enqueue untuk mencegah job ganda.

### 6.2 Rate Limit Harian
- Per penerima: maks **5 email/hari** (volume Anda <10/hari sehingga jarang tercapai).
- Jika terlampaui → jangan kirim real-time; masukkan ke **digest** (lihat 6.4).
- Implementasi: hitung `email_logs` dengan `created_at >= CURDATE()` per `recipient_email`.

### 6.3 Merge / Cooldown per Pengajuan
- Dua email ke penerima yang sama untuk **submission yang sama** dalam **15 menit** → gabung jadi 1 email (atau tunda yang kedua).
- Contoh: Admin menekan "proses" dua kali cepat (E1 lalu E7) → 1 email gabungan, bukan 2.
- Implementasi: cek `email_logs` untuk `(recipient_email, submission_id)` dengan `created_at >= NOW() - 15 menit`; jika ada, jadwalkan pengiriman dengan delay (fitur `delaySeconds` di `dispatch()` sudah tersedia).

### 6.4 Digest Sebagai Jaring Pengaman (opsional, bukan default)
Karena volume rendah & tanpa SLA, digest **tidak wajib**. Namun siapkan untuk dua kasus:
1. Rate limit tercapai (6.2) → email yang tertahan dikirim sebagai **Digest Harian pukul 16:00**.
2. Jika nanti Admin ingin "visibilitas penuh via email" → tawarkan **Digest Mingguan** berisi daftar perubahan status, bukan email per-event.
- Format digest: 1 email berisi tabel ringkas "3 pengajuan diperbarui minggu ini" + link ke dashboard.

### 6.5 Suppression & Preferensi
- **Bounce handling:** jika SMTP mengembalikan error permanen (user unknown), tandai `email_logs.status='suppressed'` dan jangan kirim ke alamat itu lagi (3 hari).
- **Preferensi per role:** tambahkan kolom `notif_email BOOLEAN DEFAULT TRUE` di tabel `users` (untuk Admin/PIC). Pengaju adalah publik — selalu kirim (butuh bukti resmi).
- **Unsubscribe:** footer email sudah bertuliskan "dikirim otomatis"; tambahkan catatan "kelola preferensi notifikasi" untuk Admin/PIC.

### 6.6 Ringkasan Alur Keputusan Email
```
Event terjadi
  → Tentukan (submission_id, event_type, recipient)
  → Cek email_logs: sudah 'sent'? → SKIP
  → Cek rate limit harian recipient? → penuh → masuk digest
  → Cek cooldown 15 menit utk (recipient, submission)? → tunda/gabung
  → dispatch email job (dengan flag dedup)
  → Worker: cek idempotency → sendMail → insert email_logs status='sent'
  → Jika gagal: retry backoff; insert 'failed' → bisa dikirim lagi
```

---

## 7. Rekomendasi Teknis Implementasi (Sesuai Stack)

### 7.1 Perubahan yang Disarankan

| # | File | Perubahan |
|---|---|---|
| 1 | `prisma/schema.prisma` | Tambah model `EmailLog` (sesuai 6.1) |
| 2 | `src/lib/server/jobs.ts` | Tambah helper `enqueueEventEmail({ key, emailKey, mailOptions })` yang cek `email_logs` sebelum dispatch |
| 3 | `src/lib/server/notifications.ts` | Ubah `NotificationService.send()` agar mendukung routing: `recipients: 'admins' \| 'user_only' \| 'both'` — **jangan selalu kirim ke semua admin** (sekarang selalu). Event E3 (diproses_pic) tidak perlu ke semua admin via email, tapi tetap via in-app |
| 4 | `src/lib/server/queue-worker.ts` | Di `handleJob` untuk `send-email`: cek idempotency `email_logs` sebelum `sendMail`; catat status sent/failed |
| 5 | `src/lib/server/email-templates.ts` | Tambah template: `assignmentToPicTemplate`, `adminVerificationTemplate` (E1b), `picCompletedTemplate` (E4), `finalResultTemplate` (E5/E8), `revisionRequestedTemplate` (E6), `picRejectedTemplate` (E7) |
| 6 | `src/routes/form/[id]/+page.server.ts` | Action `submit`: gunakan `enqueueEventEmail` dengan key `submission_received` (dedup); pertahankan email konfirmasi yang sudah ada |
| 7 | `src/routes/admin/pengajuan/[id]/+page.server.ts` | Action `process`: ganti notifikasi generik menjadi **event-aware** berdasarkan transisi: |
|    | | - `baru→ditugaskan`: email ke PIC (T-E2) + in-app |
|    | | - `ditugaskan→diproses_pic`: in-app saja (T-E3 pattern) |
|    | | - `diproses_pic→diselesaikan_pic`: email ke Admin (T-E4) + in-app |
|    | | - `diselesaikan_pic→selesai`: email ke Pengaju (T-E5) + in-app |
|    | | - `baru|ditolak_pic→revisi`: email ke Pengaju (T-E6) + in-app |
|    | | - `diproses_pic|ditugaskan→ditolak_pic`: email ke Admin (T-E7) + in-app |
|    | | - `baru|revisi→ditolak_pengajuan`: email ke Pengaju (T-E8) + in-app |
| 8 | `src/lib/server/notification-policy.ts` *(baru)* | Modul single-source-of-truth: map `(dariStatus → keStatus) → { eventKey, emailTo[], inAppTo[], template }`. Semua logika di #7 membaca modul ini — mencegah duplikasi logika & memudahkan perubahan kebijakan |

### 7.2 Queue & Scheduling
- **Existing queue** (`jobs` + worker polling 2s + retry 30s/2m/10m) **sudah cukup** untuk email real-time volume rendah. Tidak perlu RabbitMQ/BullMQ.
- **Delayed job** untuk cooldown/merge: `dispatch()` sudah mendukung `delaySeconds` — pakai untuk kebijakan merge 15 menit.
- **Digest (cadangan):** tambah queue `QUEUE_DIGEST` + worker `scripts/digest-worker.cjs`. Jadwalkan via cron OS:
  ```bash
  # macOS/Linux crontab — jalankan endpoint atau worker langsung
  0 16 * * * cd /Users/faizal/DATA/Herd\ Laravel/Testing_Fitur_Layanan_Digital && node scripts/digest-worker.cjs
  ```
  Arahkan ke endpoint SvelteKit `POST /api/cron/digest` (dengan secret token) jika worker terpisah tidak diinginkan.
- **Karena tanpa SLA**, tidak perlu scheduler reminder/eskalasi. Jika nanti SLA ditambahkan, desain ini bisa diperluas dengan worker yang mengecek `updated_at` submission vs SLA dan men-trigger email eskalasi.

### 7.3 Skalabilitas ke Depan
- Jika volume tumbuh >50/hari: aktifkan digest harian 09:00 & 16:00 untuk event informatif; pertahankan real-time hanya untuk E1, E2, E4, E5, E6, E7, E8.
- Jika prioritas menjadi penting: gunakan `is_priority` untuk menambah prefix `[PRIORITAS]` pada subjek dan skip cooldown untuk pengajuan prioritas.
- Jika butuh multi-admin per OPD: filter penerima admin berdasarkan `agency_id` submission, bukan semua admin (mengurangi spam lintas OPD).

---

## 8. Lampiran: Ringkasan Keputusan "Email Ya / Tidak"

| Status Transisi | Email | Alasan singkat |
|---|---|---|
| Submit form | Ya → Pengaju + Admin | Bukti terima & aksi verifikasi |
| → `ditugaskan` | Ya → PIC | Perubahan ownership; actionable |
| → `diproses_pic` | **Tidak** | Informatif; PIC aktif dashboard |
| → `diselesaikan_pic` | Ya → Admin | Aksi validasi final |
| → `selesai` | Ya → Pengaju | Keputusan/hak final |
| → `revisi` | Ya → Pengaju | Aksi melengkapi dokumen |
| → `ditolak_pic` | Ya → Admin | Aksi assign ulang |
| → `ditolak_pengajuan` | Ya → Pengaju | Keputusan final |