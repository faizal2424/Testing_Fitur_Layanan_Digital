import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PDFDocumentModule from 'pdfkit';
import { statusLabels, getStatusLabel } from '$lib/utils/submissionFlow';

// Handle ESM/CJS interop for pdfkit
const PDFDocument = (PDFDocumentModule as any).default || PDFDocumentModule;

export const GET: RequestHandler = async ({ url, locals }) => {
	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const q = url.searchParams.get('q') || '';
	const dateFrom = url.searchParams.get('dari') || '';
	const dateTo = url.searchParams.get('sampai') || '';

	const where: any = {};
	const user = (locals as any).user;

	if (user?.role === 'pic') {
		where.OR = [
			{ assigned_to: BigInt(user.id) },
			{ submission_team_members: { some: { user_id: BigInt(user.id) } } }
		];
	}

	if (serviceFilter) where.service_id = BigInt(serviceFilter);
	if (statusFilter) where.status = statusFilter;

	if (q) {
		const searchObj = { contains: q };
		if (where.OR) {
			where.AND = [
				{ OR: where.OR },
				{ OR: [
					{ applicant_name: searchObj },
					{ applicant_email: searchObj },
					{ tracking_code: searchObj }
				]}
			];
			delete where.OR;
		} else {
			where.OR = [
				{ applicant_name: searchObj },
				{ applicant_email: searchObj },
				{ tracking_code: searchObj }
			];
		}
	}

	if (dateFrom || dateTo) {
		where.created_at = {};
		if (dateFrom) where.created_at.gte = new Date(dateFrom + 'T00:00:00');
		if (dateTo) where.created_at.lte = new Date(dateTo + 'T23:59:59');
	}

	const submissions = await db.service_submissions.findMany({
		where,
		include: {
			services: { select: { name: true } },
			users: { select: { name: true } },
			submission_notes: {
				where: { NOT: { file_path: null } } as any,
				orderBy: { created_at: 'desc' },
				take: 1
			}
		},
		orderBy: { created_at: 'desc' }
	});

    const pdfBuffer = await generateListPDF(submissions, { dateFrom, dateTo, statusFilter });

	return new Response(new Uint8Array(pdfBuffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="laporan_pengajuan_${new Date().getTime()}.pdf"`
		}
	});
};

async function generateListPDF(submissions: any[], filters: any): Promise<Buffer> {
    const { join } = await import('path');
    const { readFileSync, existsSync } = await import('fs');

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
        const CW = PW - 80; // Content width

        // ── Header Section (Matching Image) ──
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

        // The text is centered to the page, so it spans from (PW - maxTextW)/2 to (PW + maxTextW)/2
        const textStartX = (PW - maxTextW) / 2;
        const logoX = textStartX - gap - logoW;
        let currentHdrY = 35;

        const logoPath = join(process.cwd(), 'static', 'img', 'logokabsmg.png');
        if (existsSync(logoPath)) {
            doc.image(logoPath, logoX, currentHdrY + 5, { width: logoW });
        }

        doc.fillColor('#000');
        lines.forEach((l, i) => {
            // Text is centered relative to the PAGE width
            doc.font(l.font).fontSize(l.size).text(l.text, 0, currentHdrY, { align: 'center', width: PW });
            if (i === 1) currentHdrY += 23; 
            else if (i === 0) currentHdrY += 17;
            else currentHdrY += 11;
        });

        // Double Horizontal Line
        const lineY = 127;
        doc.moveTo(40, lineY).lineTo(PW - 40, lineY).lineWidth(2).stroke('#000');
        doc.moveTo(40, lineY + 4).lineTo(PW - 40, lineY + 4).lineWidth(1).stroke('#000');

        // Document Title
        doc.font('Helvetica-Bold').fontSize(16).text('LAPORAN DATA PENGAJUAN LAYANAN', 0, 145, { align: 'center', width: PW });
        // Underline effect like in image
        const titleY = doc.y;
        doc.moveTo(PW/2 - 140, titleY + 2).lineTo(PW/2 + 140, titleY + 2).lineWidth(1.5).stroke('#000');

        doc.moveDown(2);
        
        // Print Date (Dicetak pada)
        const now = new Date();
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const printDate = `Dicetak pada: ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
        doc.font('Helvetica').fontSize(9).text(printDate, { align: 'right' });

        // ── Table Implementation ──
        const tableTop = doc.y + 10;
        // Columns: NO, LAYANAN, KODE TRACKING, NAMA PEMOHON, EMAIL, STATUS, PIC, TANGGAL, BUKTI
        const colWidths = [25, 80, 65, 85, 105, 75, 65, 80, 181];
        const headers = ['NO', 'LAYANAN', 'KODE TRACKING', 'NAMA PEMOHON', 'EMAIL', 'STATUS', 'PIC', 'TANGGAL', 'BUKTI'];
        
        const drawTableHeader = (y: number) => {
            doc.save();
            doc.rect(40, y, CW, 30).fill('#d1d5db'); // Gray header bg
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000');
            
            let currentX = 40;
            headers.forEach((h, i) => {
                doc.rect(currentX, y, colWidths[i], 30).stroke('#000');
                doc.text(h, currentX, y + 8, { width: colWidths[i], align: 'center' });
                currentX += colWidths[i];
            });
            doc.restore();
        };

        drawTableHeader(tableTop);

        let currentY = tableTop + 30;
        const rowHeight = 70; // Increased to fit thumbnails

        submissions.forEach((s, index) => {
            if (currentY + rowHeight > doc.page.height - 60) {
                doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 30, bottom: 40, left: 40, right: 40 } });
                currentY = 40;
                drawTableHeader(currentY);
                currentY += 30;
            }

            let currentX = 40;
            const rowData = [
                (index + 1).toString(),
                s.services.name,
                s.tracking_code,
                s.applicant_name,
                s.applicant_email,
                getStatusLabel(s.status).toUpperCase(),
                s.users?.name || '—',
                s.created_at ? new Date(s.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '\n') : '—',
                '' // Evidence placeholder
            ];

            doc.font('Helvetica').fontSize(8);
            rowData.forEach((text, i) => {
                doc.rect(currentX, currentY, colWidths[i], rowHeight).stroke('#000');
                
                if (i === 8) { // Bukti Pengerjaan
                    const evidence = s.submission_notes?.[0]?.file_path;
                    if (evidence) {
                        const fullPath = join(process.cwd(), 'static', evidence);
                        if (existsSync(fullPath)) {
                            try {
                                // Fit image in column (4x6 ratio-ish center)
                                // We use fit: [maxWidth, maxHeight] to maintain aspect ratio
                                doc.image(fullPath, currentX + (colWidths[i] - 40) / 2, currentY + 5, { 
                                    fit: [40, 60] 
                                });
                            } catch (e) {
                                doc.text('Err', currentX, currentY + rowHeight/2 - 4, { width: colWidths[i], align: 'center' });
                            }
                        } else {
                            doc.text('-', currentX, currentY + rowHeight/2 - 4, { width: colWidths[i], align: 'center' });
                        }
                    } else {
                        doc.text('-', currentX, currentY + rowHeight/2 - 4, { width: colWidths[i], align: 'center' });
                    }
                } else {
                    let align: 'center' | 'left' = 'left';
                    if ([0, 2, 5, 7].includes(i)) align = 'center';
                    
                    doc.text(text, currentX + 3, currentY + (rowHeight/2 - 8), { 
                        width: colWidths[i] - 6, 
                        align: align,
                        lineBreak: true
                    });
                }
                currentX += colWidths[i];
            });

            currentY += rowHeight;
        });

        doc.end();
    });
}
