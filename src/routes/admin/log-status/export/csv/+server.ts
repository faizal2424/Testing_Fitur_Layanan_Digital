import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const search = url.searchParams.get('cari') || '';
	const dateFrom = url.searchParams.get('dari') || '';
	const dateTo = url.searchParams.get('sampai') || '';

	const where: any = {
		user_id: locals.user?.id
	};

	if (statusFilter) where.status_to = statusFilter;

	if (serviceFilter) {
		where.service_submissions = { service_id: BigInt(serviceFilter) };
	}

	if (search) {
		where.AND = [
			{ user_id: locals.user?.id },
			{
				OR: [
					{ note: { contains: search } },
					{ service_submissions: { tracking_code: { contains: search } } }
				]
			}
		];
		if (where.user_id) delete where.user_id;
	}

	if (dateFrom || dateTo) {
		where.created_at = {};
		if (dateFrom) where.created_at.gte = new Date(dateFrom + 'T00:00:00');
		if (dateTo) where.created_at.lte = new Date(dateTo + 'T23:59:59');
	}

	const logs = await db.submission_notes.findMany({
		where,
		include: {
			users: { select: { name: true } },
			service_submissions: {
				select: {
					tracking_code: true,
					applicant_name: true,
					services: { select: { name: true } }
				}
			}
		},
		orderBy: { created_at: 'desc' }
	});

	const statusLabels: Record<string, string> = {
		baru: 'Baru', ditugaskan: 'Ditugaskan', diproses_pic: 'Diproses PIC',
		ditolak_pic: 'Ditolak PIC', diselesaikan_pic: 'Diselesaikan PIC',
		disetujui_pic: 'Disetujui PIC', ditolak_pengajuan: 'Ditolak', selesai: 'Selesai'
	};

	const formatDate = (d: Date | null) => {
		if (!d) return '';
		return d.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	};

	const headers = ['Tanggal', 'Tracking Code', 'Pemohon', 'Layanan', 'Status Dari', 'Status Ke', 'Catatan', 'Diubah Oleh'];
	const rows = logs.map(l => [
		formatDate(l.created_at),
		l.service_submissions.tracking_code,
		l.service_submissions.applicant_name || '-',
		l.service_submissions.services.name,
		l.status_from ? (statusLabels[l.status_from] || l.status_from) : '-',
		l.status_to ? (statusLabels[l.status_to] || l.status_to) : '-',
		(l.note || '-').replace(/"/g, '""'),
		l.users?.name || 'Sistem'
	]);

	const csvContent = [
		'\uFEFF' + headers.join(','),
		...rows.map(row => row.map(val => `"${val}"`).join(','))
	].join('\n');

	const dateStr = new Date().toISOString().split('T')[0];

	return new Response(csvContent, {
		headers: {
			'Content-Type': 'text/csv;charset=utf-8',
			'Content-Disposition': `attachment; filename="log-status_${dateStr}.csv"`
		}
	});
};
