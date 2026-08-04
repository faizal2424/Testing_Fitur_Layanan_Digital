/**
 * Single source of truth for status labels and colors.
 * 
 * Two label sets are provided:
 * - INTERNAL: Used in admin UI, StatusBadge, log-status exports
 * - PUBLIC: User-friendly labels for public tracking pages and API
 */

export type SubmissionStatus =
	| 'baru'
	| 'revisi'
	| 'ditugaskan'
	| 'diproses_pic'
	| 'ditolak_pic'
	| 'diselesaikan_pic'
	| 'disetujui_pic'
	| 'ditolak_pengajuan'
	| 'selesai';

/**
 * Internal/Admin labels - used in admin dashboard, StatusBadge, exports
 */
export const INTERNAL_STATUS_LABELS: Record<SubmissionStatus, string> = {
	baru: 'Baru',
	revisi: 'Perlu Revisi',
	ditugaskan: 'Ditugaskan',
	diproses_pic: 'Diproses PIC',
	ditolak_pic: 'Ditolak PIC',
	diselesaikan_pic: 'Diselesaikan PIC',
	disetujui_pic: 'Disetujui PIC',
	ditolak_pengajuan: 'Ditolak',
	selesai: 'Selesai'
};

/**
 * Public-facing labels - used in public tracking page and public API
 * More user-friendly terminology for citizens
 */
export const PUBLIC_STATUS_LABELS: Record<SubmissionStatus, string> = {
	baru: 'Diterima',
	revisi: 'Perlu Revisi',
	ditugaskan: 'Verifikasi',
	diproses_pic: 'Proses',
	ditolak_pic: 'Ditolak PIC',
	diselesaikan_pic: 'Validasi',
	disetujui_pic: 'Disetujui PIC',
	ditolak_pengajuan: 'Pengajuan Ditangguhkan',
	selesai: 'Selesai'
};

/**
 * Status colors for UI badges
 */
export const STATUS_COLORS: Record<SubmissionStatus, string> = {
	baru: 'blue',
	revisi: 'amber',
	ditugaskan: 'indigo',
	diproses_pic: 'violet',
	ditolak_pic: 'orange',
	diselesaikan_pic: 'teal',
	disetujui_pic: 'cyan',
	ditolak_pengajuan: 'red',
	selesai: 'green'
};

/**
 * Get internal/admin label for a status
 */
export function getInternalStatusLabel(status: string): string {
	return INTERNAL_STATUS_LABELS[status as SubmissionStatus] || status;
}

/**
 * Get public-facing label for a status
 */
export function getPublicStatusLabel(status: string): string {
	return PUBLIC_STATUS_LABELS[status as SubmissionStatus] || status;
}

/**
 * Get color for a status
 */
export function getStatusColor(status: string): string {
	return STATUS_COLORS[status as SubmissionStatus] || 'gray';
}

/**
 * Get allowed next statuses based on current status and user role
 */
export function getAllowedStatuses(currentStatus: string, role: string): string[] {
	if (role === 'superadmin') {
		return Object.keys(INTERNAL_STATUS_LABELS).filter((s) => s !== currentStatus);
	}

	if (role === 'admin') {
		switch (currentStatus) {
			// Pengajuan baru diterima Admin untuk verifikasi data dan penugasan PIC
			case 'baru':
				return ['ditugaskan', 'revisi', 'ditolak_pengajuan'];
			// Setelah ditugaskan, penanganan selanjutnya menjadi tanggung jawab PIC
			case 'ditugaskan':
				return [];
			// Pengajuan yang ditolak PIC dapat ditugaskan ulang oleh Admin
			case 'ditolak_pic':
				return ['ditugaskan', 'revisi', 'ditolak_pengajuan'];
			case 'revisi':
				return ['ditolak_pengajuan'];
			case 'diselesaikan_pic':
				return ['selesai'];
			default:
				return [];
		}
	}

	if (role === 'pic') {
		switch (currentStatus) {
			case 'ditugaskan':
				return ['diproses_pic', 'ditolak_pic'];
			case 'diproses_pic':
				return ['diselesaikan_pic'];
			default:
				return [];
		}
	}

	return [];
}

/**
 * All status keys for iteration
 */
export const ALL_STATUSES: SubmissionStatus[] = Object.keys(INTERNAL_STATUS_LABELS) as SubmissionStatus[];