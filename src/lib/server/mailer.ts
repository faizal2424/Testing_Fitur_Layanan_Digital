/**
 * Mailer singleton menggunakan nodemailer.
 * Gunakan `sendMail()` dari seluruh server-side code.
 */
import nodemailer from 'nodemailer';
import {
	SMTP_HOST,
	SMTP_PORT,
	SMTP_SECURE,
	SMTP_USER,
	SMTP_PASS,
	SMTP_FROM
} from '$env/static/private';

/** Transporter nodemailer — dibuat sekali, dipakai ulang */
export const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: Number(SMTP_PORT),
	secure: SMTP_SECURE === 'true', // true untuk SSL port 465, false untuk STARTTLS port 587/2525
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS
	}
});

/** Alamat pengirim default dari .env */
export const defaultFrom = SMTP_FROM;

/** Opsi pengiriman email */
export interface MailOptions {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	cc?: string | string[];
	bcc?: string | string[];
	replyTo?: string;
}

/**
 * Kirim email.
 * @example
 * await sendMail({ to: 'user@example.com', subject: 'Halo', html: '<p>Halo!</p>' });
 */
export async function sendMail(options: MailOptions) {
	const info = await transporter.sendMail({
		from: defaultFrom,
		...options
	});

	console.log(`[Mailer] Email terkirim ke ${options.to} — MessageId: ${info.messageId}`);
	return info;
}

/**
 * Verifikasi koneksi SMTP.
 * Berguna untuk health-check di startup atau endpoint test.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
	try {
		await transporter.verify();
		return { ok: true };
	} catch (err) {
		console.error('[Mailer] SMTP connection failed:', err);
		return { ok: false, error: String(err) };
	}
}
