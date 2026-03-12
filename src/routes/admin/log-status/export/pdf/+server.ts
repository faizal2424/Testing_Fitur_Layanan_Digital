import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import PDFDocumentModule from 'pdfkit';

const PDFDocument = (PDFDocumentModule as any).default || PDFDocumentModule;

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

	const pdfBuffer = await generateLogPDF(logs, { dateFrom, dateTo, statusFilter });

	return new Response(new Uint8Array(pdfBuffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="log-status_${new Date().getTime()}.pdf"`
		}
	});
};

async function generateLogPDF(logs: any[], filters: any): Promise<Buffer> {
	const { join } = await import('path');
	const { existsSync } = await import('fs');

	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			layout: 'landscape',
			margins: { top: 30, bottom: 40, left: 40, right: 40 }
		});

		const chunks: Uint8Array[] = [];
		doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		const PW = doc.page.width;
		const CW = PW - 80;

		// ── Header (Same style as Pengajuan) ──
		const logoW = 75;
		const gap = 15;

		const lines = [
			{ text: 'PEMERINTAH DAERAH KABUPATEN SEMARANG', font: 'Helvetica-Bold', size: 14 },
			{ text: 'DINAS KOMUNIKASI DAN INFORMATIKA', font: 'Helvetica-Bold', size: 16 },
			{ text: 'Alamat : Jl. Diponegoro No. 14, Gedung D, Ungaran, Kab.Semarang', font: 'Helvetica', size: 9 },
			{ text: 'No. Tlp: (024) 76901553', font: 'Helvetica', size: 9 },
			{ text: 'Laman: diskominfo.semarangkab.go.id, Pos-el : kominfo@semarangkab.go.id', font: 'Helvetica', size: 9 },
			{ text: 'Kode pos : 50511', font: 'Helvetica', size: 9 }
		];

		let maxTextW = 0;
		lines.forEach(l => {
			doc.font(l.font).fontSize(l.size);
			const w = doc.widthOfString(l.text);
			if (w > maxTextW) maxTextW = w;
		});

		const textStartX = (PW - maxTextW) / 2;
		const logoX = textStartX - gap - logoW;
		let currentHdrY = 35;

		const logoPath = join(process.cwd(), 'static', 'img', 'logokabsmg.png');
		if (existsSync(logoPath)) {
			doc.image(logoPath, logoX, currentHdrY + 5, { width: logoW });
		}

		doc.fillColor('#000');
		lines.forEach((l, i) => {
			doc.font(l.font).fontSize(l.size).text(l.text, 0, currentHdrY, { align: 'center', width: PW });
			if (i === 1) currentHdrY += 23;
			else if (i === 0) currentHdrY += 17;
			else currentHdrY += 11;
		});

		// Double line
		const lineY = 127;
		doc.moveTo(40, lineY).lineTo(PW - 40, lineY).lineWidth(2).stroke('#000');
		doc.moveTo(40, lineY + 4).lineTo(PW - 40, lineY + 4).lineWidth(1).stroke('#000');

		// Document Title
		doc.font('Helvetica-Bold').fontSize(16).text('LAPORAN LOG STATUS PENGAJUAN LAYANAN', 0, 145, { align: 'center', width: PW });
		const titleY = doc.y;
		doc.moveTo(PW / 2 - 160, titleY + 2).lineTo(PW / 2 + 160, titleY + 2).lineWidth(1.5).stroke('#000');

		doc.moveDown(2);

		const now = new Date();
		const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
		const printDate = `Dicetak pada: ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
		doc.font('Helvetica').fontSize(9).text(printDate, { align: 'right' });

		// ── Table ──
		const tableTop = doc.y + 10;
		const colWidths = [25, 70, 70, 90, 85, 90, 90, 180, 65];
		const headers = ['NO', 'TANGGAL', 'TRACKING', 'PEMOHON', 'STATUS DARI', 'STATUS KE', 'LAYANAN', 'CATATAN', 'OLEH'];

		const statusLabels: Record<string, string> = {
			baru: 'BARU', ditugaskan: 'DITUGASKAN', diproses_pic: 'DIPROSES PIC',
			ditolak_pic: 'DITOLAK PIC', diselesaikan_pic: 'DISELESAIKAN PIC',
			disetujui_pic: 'DISETUJUI PIC', ditolak_pengajuan: 'DITOLAK', selesai: 'SELESAI'
		};

		const drawTableHeader = (y: number) => {
			doc.save();
			doc.rect(40, y, CW, 28).fill('#d1d5db');
			doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
			let x = 40;
			headers.forEach((h, i) => {
				doc.rect(x, y, colWidths[i], 28).stroke('#000');
				doc.text(h, x, y + 8, { width: colWidths[i], align: 'center' });
				x += colWidths[i];
			});
			doc.restore();
		};

		drawTableHeader(tableTop);

		let currentY = tableTop + 28;
		const rowHeight = 40;

		const formatDate = (d: Date | null) => {
			if (!d) return '-';
			return d.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
		};

		logs.forEach((l, index) => {
			if (currentY + rowHeight > doc.page.height - 60) {
				doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 30, bottom: 40, left: 40, right: 40 } });
				currentY = 40;
				drawTableHeader(currentY);
				currentY += 28;
			}

			let x = 40;
			const rowData = [
				(index + 1).toString(),
				formatDate(l.created_at),
				l.service_submissions.tracking_code,
				l.service_submissions.applicant_name || '-',
				l.status_from ? (statusLabels[l.status_from] || l.status_from.toUpperCase()) : '-',
				l.status_to ? (statusLabels[l.status_to] || l.status_to.toUpperCase()) : '-',
				l.service_submissions.services.name,
				(l.note || '-').substring(0, 120),
				l.users?.name || 'Sistem'
			];

			doc.font('Helvetica').fontSize(7.5);
			rowData.forEach((text, i) => {
				doc.rect(x, currentY, colWidths[i], rowHeight).stroke('#000');
				const align: 'center' | 'left' = [0, 4, 5].includes(i) ? 'center' : 'left';
				doc.text(String(text), x + 3, currentY + (rowHeight / 2 - 8), {
					width: colWidths[i] - 6,
					align,
					lineBreak: true
				});
				x += colWidths[i];
			});

			currentY += rowHeight;
		});

		doc.end();
	});
}
