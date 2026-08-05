/**
 * Notification Policy — single-source-of-truth pemetaan transisi status → event notifikasi.
 *
 * Berdasarkan dokumen `docs/notifikasi-email-design.md`:
 * - Email real-time hanya untuk event "actionable" atau "keputusan final".
 * - Notifikasi in-app untuk status transisi/informatif.
 *
 * Legend: email = real-time · inapp = in-app
 */

import type { NotificationType } from './notifications';

export type RecipientRole = 'pengaju' | 'admin' | 'pic';

export interface NotificationPolicyRule {
	/** Event key unik untuk idempotency email_logs (E1..E9). */
	eventKey: string;
	/** Email: siapa yang menerima email real-time ([] = tidak ada email). */
	email: RecipientRole[];
	/** In-app: siapa yang menerima notifikasi in-app ([] = tidak ada in-app). */
	inapp: RecipientRole[];
	/** Tipe notifikasi in-app. */
	inappType: NotificationType;
	/** Judul notifikasi in-app. */
	inappTitle: string;
	/** Deskripsi singkat untuk dokumentasi/debug. */
	description: string;
}

/**
 * Map transisi status → policy.
 * Key: `${fromStatus}->${toStatus}` atau `submit` untuk pengajuan baru.
 */
export const NOTIFICATION_POLICY: Record<string, NotificationPolicyRule> = {
	// E1 — Pengajuan baru (form submit): email ke Pengaju + Admin, in-app ke keduanya
	submit: {
		eventKey: 'submission_received',
		email: ['pengaju', 'admin'],
		inapp: ['pengaju', 'admin'],
		inappType: 'success',
		inappTitle: 'Pengajuan Diterima',
		description: 'Pengajuan baru masuk — bukti resmi (tracking code) + verifikasi Admin'
	},

	// E2 — Ditugaskan ke PIC: email ke PIC, in-app ke Pengaju + Admin + PIC
	'baru->ditugaskan': {
		eventKey: 'assigned_to_pic',
		email: ['pic'],
		inapp: ['pengaju', 'admin', 'pic'],
		inappType: 'info',
		inappTitle: 'Ditugaskan ke PIC',
		description: 'Perubahan ownership — email ke PIC sebagai jaring pengaman'
	},
	'ditolak_pic->ditugaskan': {
		eventKey: 'assigned_to_pic',
		email: ['pic'],
		inapp: ['pengaju', 'admin', 'pic'],
		inappType: 'info',
		inappTitle: 'Ditugaskan ke PIC',
		description: 'Penugasan ulang setelah ditolak PIC'
	},

	// E3 — PIC mulai proses: in-app saja
	'ditugaskan->diproses_pic': {
		eventKey: 'pic_started',
		email: [],
		inapp: ['admin', 'pic'],
		inappType: 'info',
		inappTitle: 'Diproses PIC',
		description: 'Status internal — tidak actionable, tanpa email (penghemat terbesar)'
	},

	// E4 — PIC selesai: email ke Admin, in-app ke Admin + PIC
	'diproses_pic->diselesaikan_pic': {
		eventKey: 'pic_completed',
		email: ['admin'],
		inapp: ['admin', 'pic'],
		inappType: 'info',
		inappTitle: 'Diselesaikan PIC',
		description: 'Admin harus validasi final — Pengaju TIDAK dapat email (hindari ganda E4+E5)'
	},

	// E5 — Selesai final: email ke Pengaju, in-app ke semuanya
	'diselesaikan_pic->selesai': {
		eventKey: 'submission_completed',
		email: ['pengaju'],
		inapp: ['pengaju', 'admin', 'pic'],
		inappType: 'success',
		inappTitle: 'Pengajuan Selesai',
		description: 'Keputusan final yang mengubah hak penerima — wajib jejak resmi'
	},

	// E6 — Revisi diminta: email ke Pengaju, in-app ke Pengaju + Admin
	'baru->revisi': {
		eventKey: 'revision_requested',
		email: ['pengaju'],
		inapp: ['pengaju', 'admin'],
		inappType: 'warning',
		inappTitle: 'Perlu Revisi',
		description: 'Sangat actionable — tanpa email pengajuan bisa menggantung tanpa batas'
	},
	'ditolak_pic->revisi': {
		eventKey: 'revision_requested',
		email: ['pengaju'],
		inapp: ['pengaju', 'admin'],
		inappType: 'warning',
		inappTitle: 'Perlu Revisi',
		description: 'Revisi diminta setelah ditolak PIC'
	},
	'revisi->revisi': {
		eventKey: 'revision_requested',
		email: ['pengaju'],
		inapp: ['pengaju', 'admin'],
		inappType: 'warning',
		inappTitle: 'Perlu Revisi',
		description: 'Revisi berulang'
	},

	// E9 — Revisi dikirim ulang oleh pengaju: email ke Admin (actionable), in-app ke Pengaju + Admin
	'revisi->baru': {
		eventKey: 'revision_submitted',
		email: ['admin'],
		inapp: ['pengaju', 'admin'],
		inappType: 'info',
		inappTitle: 'Revisi Dikirim',
		description: 'Pengaju mengirim ulang form revisi — Admin harus verifikasi ulang'
	},

	// E7 — Ditolak PIC: email ke Admin, in-app ke Admin + PIC
	'ditugaskan->ditolak_pic': {
		eventKey: 'rejected_by_pic',
		email: ['admin'],
		inapp: ['admin', 'pic'],
		inappType: 'error',
		inappTitle: 'Ditolak PIC',
		description: 'Admin harus assign ulang/revisi/tolak — PIC tidak perlu email (dia yang menolak)'
	},
	'diproses_pic->ditolak_pic': {
		eventKey: 'rejected_by_pic',
		email: ['admin'],
		inapp: ['admin', 'pic'],
		inappType: 'error',
		inappTitle: 'Ditolak PIC',
		description: 'PIC menolak saat proses'
	},

	// E8 — Pengajuan ditolak (final): email ke Pengaju, in-app ke Pengaju + Admin
	'baru->ditolak_pengajuan': {
		eventKey: 'submission_rejected',
		email: ['pengaju'],
		inapp: ['pengaju', 'admin'],
		inappType: 'error',
		inappTitle: 'Pengajuan Ditolak',
		description: 'Keputusan final penolakan — wajib dikomunikasikan resmi'
	},
	'ditolak_pic->ditolak_pengajuan': {
		eventKey: 'submission_rejected',
		email: ['pengaju'],
		inapp: ['pengaju', 'admin'],
		inappType: 'error',
		inappTitle: 'Pengajuan Ditolak',
		description: 'Penolakan final setelah ditolak PIC'
	},
	'revisi->ditolak_pengajuan': {
		eventKey: 'submission_rejected',
		email: ['pengaju'],
		inapp: ['pengaju', 'admin'],
		inappType: 'error',
		inappTitle: 'Pengajuan Ditolak',
		description: 'Penolakan final setelah revisi tidak dipenuhi'
	}
	// E9 (dokumen kurang) dipicu manual, bukan transisi status — ditangani caller.
};

/**
 * Ambil policy untuk transisi status tertentu.
 * Returns undefined bila transisi tidak memiliki notifikasi apapun.
 */
export function getNotificationPolicy(from: string, to: string): NotificationPolicyRule | undefined {
	if (from === 'submit') return NOTIFICATION_POLICY.submit;
	return NOTIFICATION_POLICY[`${from}->${to}`];
}

/**
 * Daftar event keys yang mengirim email (untuk idempotency / laporan).
 */
export const EMAIL_EVENT_KEYS: string[] = Object.values(NOTIFICATION_POLICY)
	.map((p) => p.eventKey)
	.filter((v, i, a) => a.indexOf(v) === i);