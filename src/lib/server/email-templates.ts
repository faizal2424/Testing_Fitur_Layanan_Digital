/**
 * Template HTML email — Minimalist & Stylish
 * Terinspirasi desain email Stripe, Linear, Notion.
 * Tanpa emoji berlebihan, tipografi bersih, warna subtle.
 */

// ─── Status mapping ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
	pending:    { color: '#b45309', label: 'Menunggu' },
	baru:       { color: '#1d4ed8', label: 'Baru Masuk' },
	diproses:   { color: '#1d4ed8', label: 'Sedang Diproses' },
	disetujui:  { color: '#15803d', label: 'Disetujui' },
	ditolak:    { color: '#b91c1c', label: 'Ditolak' },
	selesai:    { color: '#6d28d9', label: 'Selesai' },
	approved:   { color: '#15803d', label: 'Approved' },
	rejected:   { color: '#b91c1c', label: 'Rejected' },
	processing: { color: '#1d4ed8', label: 'Processing' },
	completed:  { color: '#6d28d9', label: 'Completed' }
};

// ─── Shared Layout ────────────────────────────────────────────────────────────
function wrapLayout(accentColor: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Notifikasi Layanan Digital</title>
  <style>
    /* Reset */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f5f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }

    /* Wrapper */
    .email-wrapper { width: 100%; padding: 48px 16px; background-color: #f5f5f4; }
    .email-container { max-width: 560px; margin: 0 auto; }

    /* Brand bar */
    .brand { text-align: left; margin-bottom: 28px; padding: 0 4px; }
    .brand-name { font-size: 13px; font-weight: 700; color: #78716c; letter-spacing: 0.08em; text-transform: uppercase; }
    .brand-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${accentColor}; margin-right: 8px; vertical-align: middle; position: relative; top: -1px; }

    /* Card */
    .card { background: #ffffff; border-radius: 4px; border: 1px solid #e7e5e4; overflow: hidden; }
    .card-accent { height: 3px; background: ${accentColor}; }
    .card-body { padding: 40px 40px 36px; }

    /* Typography */
    .greeting { font-size: 22px; font-weight: 600; color: #1c1917; line-height: 1.3; margin-bottom: 12px; }
    .text { font-size: 15px; color: #57534e; line-height: 1.7; margin-bottom: 14px; }
    .text strong { color: #1c1917; font-weight: 600; }
    .text-sm { font-size: 13px; color: #78716c; line-height: 1.6; }

    /* Divider */
    .divider { border: none; border-top: 1px solid #f0efee; margin: 28px 0; }

    /* Info block */
    .info-block { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .info-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #a8a29e; margin-bottom: 4px; }
    .info-value { font-size: 15px; font-weight: 600; color: #1c1917; }
    .info-code { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; color: ${accentColor}; letter-spacing: 0.05em; }

    /* Status badge */
    .status-block { display: inline-block; padding: 6px 14px; border-radius: 2px; background: ${accentColor}12; border-left: 3px solid ${accentColor}; margin: 16px 0; }
    .status-text { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${accentColor}; }

    /* Button */
    .btn-wrapper { margin: 28px 0 8px; }
    .btn { display: inline-block; padding: 11px 24px; background: ${accentColor}; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600; letter-spacing: 0.01em; }

    /* Notes box */
    .notes-box { background: #fafaf9; border: 1px solid #e7e5e4; border-left: 3px solid ${accentColor}; border-radius: 0 4px 4px 0; padding: 14px 18px; margin: 20px 0; }
    .notes-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #a8a29e; margin-bottom: 6px; }
    .notes-text { font-size: 14px; color: #44403c; line-height: 1.6; }

    /* Doc list */
    .doc-list { margin: 16px 0; padding: 0; list-style: none; }
    .doc-list li { font-size: 14px; color: #44403c; padding: 6px 0; border-bottom: 1px solid #f0efee; display: flex; align-items: center; gap: 10px; }
    .doc-list li:last-child { border-bottom: none; }
    .doc-bullet { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: ${accentColor}; flex-shrink: 0; }

    /* Footer */
    .footer { padding: 24px 4px 0; }
    .footer-text { font-size: 12px; color: #a8a29e; line-height: 1.7; }
    .footer-divider { border: none; border-top: 1px solid #e7e5e4; margin-bottom: 16px; }

    /* Mobile */
    @media only screen and (max-width: 600px) {
      .card-body { padding: 28px 24px 24px; }
      .greeting { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">

      <div class="brand">
        <span class="brand-dot"></span>
        <span class="brand-name">Layanan Digital</span>
      </div>

      <div class="card">
        <div class="card-accent"></div>
        <div class="card-body">
          ${body}
        </div>
      </div>

      <div class="footer">
        <hr class="footer-divider">
        <p class="footer-text">
          Email ini dikirim secara otomatis. Mohon tidak membalas email ini.<br>
          Jika Anda tidak merasa melakukan pengajuan ini, abaikan email ini.
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ─── Template 1: Permohonan Diterima ─────────────────────────────────────────
export function submissionReceivedTemplate(data: {
	name: string;
	serviceName: string;
	submissionId: string | number;
	trackingUrl?: string;
}): string {
	return wrapLayout(
		'#1d4ed8',
		`
    <p class="greeting">Permohonan diterima.</p>
    <p class="text">Halo <strong>${data.name}</strong>, permohonan Anda untuk layanan <strong>${data.serviceName}</strong> telah berhasil kami terima dan sedang dalam antrian verifikasi.</p>

    <div class="info-block">
      <p class="info-label">Kode Pelacakan</p>
      <p class="info-code">${data.submissionId}</p>
    </div>

    <hr class="divider">

    <p class="text">Tim kami akan segera memproses permohonan Anda. Notifikasi akan dikirimkan ketika terdapat pembaruan status.</p>

    ${
			data.trackingUrl
				? `<div class="btn-wrapper"><a href="${data.trackingUrl}" class="btn">Lacak Status Permohonan</a></div>`
				: ''
		}
    `
	);
}

// ─── Template 2: Update Status Permohonan ────────────────────────────────────
export function statusUpdateTemplate(data: {
	name: string;
	serviceName: string;
	submissionId?: string | number;
	newStatus: string;
	notes?: string;
	trackingUrl?: string;
}): string {
	const config = STATUS_CONFIG[data.newStatus.toLowerCase()] ?? {
		color: '#57534e',
		label: data.newStatus
	};

	return wrapLayout(
		config.color,
		`
    <p class="greeting">Pembaruan status permohonan.</p>
    <p class="text">Halo <strong>${data.name}</strong>, terdapat pembaruan pada permohonan Anda untuk layanan <strong>${data.serviceName}</strong>${data.submissionId ? ` dengan kode <strong>${data.submissionId}</strong>` : ''}.</p>

    <div class="status-block">
      <span class="status-text">${config.label}</span>
    </div>

    ${
			data.notes
				? `<div class="notes-box">
            <p class="notes-label">Catatan</p>
            <p class="notes-text">${data.notes}</p>
          </div>`
				: ''
		}

    <hr class="divider">

    <p class="text-sm">Jika Anda memiliki pertanyaan mengenai status permohonan, silakan hubungi kantor kami.</p>

    ${
			data.trackingUrl
				? `<div class="btn-wrapper"><a href="${data.trackingUrl}" class="btn">Lihat Detail Permohonan</a></div>`
				: ''
		}
    `
	);
}

// ─── Template 3: Selamat Datang ───────────────────────────────────────────────
export function welcomeTemplate(data: { name: string; email: string }): string {
	return wrapLayout(
		'#15803d',
		`
    <p class="greeting">Selamat datang, ${data.name}.</p>
    <p class="text">Akun Anda dengan alamat email <strong>${data.email}</strong> telah berhasil terdaftar di Sistem Layanan Digital.</p>

    <hr class="divider">

    <p class="text">Anda kini dapat mengajukan berbagai permohonan layanan secara daring dengan mudah dan efisien.</p>

    <p class="text-sm" style="margin-top:12px;">Jika Anda tidak merasa mendaftar, abaikan email ini atau hubungi tim kami segera.</p>
    `
	);
}

// ─── Template 4: Dokumen Kurang ───────────────────────────────────────────────
export function documentReminderTemplate(data: {
	name: string;
	serviceName: string;
	missingDocs: string[];
	submissionId?: string | number;
}): string {
	const docItems = data.missingDocs
		.map(
			(d) => `
      <li>
        <span class="doc-bullet"></span>
        ${d}
      </li>`
		)
		.join('');

	return wrapLayout(
		'#b45309',
		`
    <p class="greeting">Dokumen belum lengkap.</p>
    <p class="text">Halo <strong>${data.name}</strong>, permohonan Anda untuk layanan <strong>${data.serviceName}</strong>${data.submissionId ? ` (kode: <strong>${data.submissionId}</strong>)` : ''} memerlukan kelengkapan dokumen berikut:</p>

    <ul class="doc-list">
      ${docItems}
    </ul>

    <hr class="divider">

    <p class="text-sm">Mohon segera melengkapi dokumen yang diperlukan agar proses permohonan dapat dilanjutkan. Hubungi kantor kami jika membutuhkan bantuan.</p>
    `
	);
}
