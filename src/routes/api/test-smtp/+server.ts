/**
 * GET /api/test-smtp
 * Endpoint untuk memverifikasi koneksi SMTP dan mengirim email test.
 * HAPUS endpoint ini di production!
 */
import { json } from '@sveltejs/kit';
import { sendMail, verifySmtpConnection } from '$lib/server/mailer';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const targetEmail = url.searchParams.get('to') ?? 'test@example.com';

	// 1. Verifikasi koneksi SMTP terlebih dahulu
	const connection = await verifySmtpConnection();

	if (!connection.ok) {
		return json(
			{
				success: false,
				step: 'connection',
				error: connection.error,
				hint: 'Periksa konfigurasi SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS di .env'
			},
			{ status: 500 }
		);
	}

	// 2. Kirim email test
	try {
		const info = await sendMail({
			to: targetEmail,
			subject: '✅ Test SMTP — Layanan Digital',
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #22c55e; font-size: 24px;">✅ SMTP Berhasil!</h1>
          <p style="color: #444; line-height: 1.6;">
            Konfigurasi SMTP Anda berjalan dengan baik.<br>
            Email ini dikirim dari sistem <strong>Layanan Digital</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Waktu pengiriman: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
          </p>
        </div>
      `,
			text: 'SMTP berhasil dikonfigurasi! Email ini dikirim dari sistem Layanan Digital.'
		});

		return json({
			success: true,
			message: `Email berhasil dikirim ke ${targetEmail}`,
			messageId: info.messageId
		});
	} catch (error) {
		console.error('[test-smtp] Gagal kirim email:', error);
		return json(
			{
				success: false,
				step: 'send',
				error: String(error)
			},
			{ status: 500 }
		);
	}
};
