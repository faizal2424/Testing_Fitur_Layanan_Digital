export const statusLabels: Record<string, string> = {
	baru: 'Baru',
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
	ditugaskan: 'amber',
	diproses_pic: 'indigo',
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
			case 'baru':
			case 'ditolak_pic':
				return ['ditugaskan', 'ditolak_pengajuan'];
			case 'diselesaikan_pic':
				return ['selesai'];
			// Optionally allow reverting back if they notice a mistake
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