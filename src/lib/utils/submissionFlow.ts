export const statusLabels: Record<string, string> = {
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

export const statusColors: Record<string, string> = {
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

export function getStatusLabel(status: string): string {
	return statusLabels[status] || status;
}

export function getStatusColor(status: string): string {
	return statusColors[status] || 'gray';
}

export function getAllowedStatuses(currentStatus: string, role: string): string[] {
	if (role === 'superadmin') {
		return Object.keys(statusLabels).filter((s) => s !== currentStatus);
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