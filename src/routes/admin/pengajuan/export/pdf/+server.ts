import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PDFDocumentModule from 'pdfkit';

// Handle ESM/CJS interop for pdfkit
const PDFDocument = (PDFDocumentModule as any).default || PDFDocumentModule;

export const GET: RequestHandler = async ({ url, locals }) => {
	const serviceFilter = url.searchParams.get('layanan') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const search = url.searchParams.get('cari') || '';
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

	if (search) {
		const searchObj = { contains: search };
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
			users: { select: { name: true } }
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
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margins: { top: 40, bottom: 40, left: 40, right: 40 }
        });

        const chunks: Uint8Array[] = [];
        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN DATA PENGAJUAN LAYANAN DIGITAL', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Dinas Komunikasi dan Informatika Kabupaten Semarang', { align: 'center' });
        doc.moveDown();

        // Filter info
        let filterText = `Tanggal: ${filters.dateFrom || '-'} s/d ${filters.dateTo || '-'}`;
        if (filters.statusFilter) filterText += ` | Status: ${filters.statusFilter}`;
        doc.fontSize(9).text(filterText, { align: 'left' });
        doc.text(`Total Data: ${submissions.length}`, { align: 'left' });
        doc.moveDown();

        // Table setup
        const tableTop = doc.y;
        const colWidths = [100, 150, 150, 100, 100, 100];
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const headers = ['Kode Tracking', 'Pemohon', 'Layanan', 'Status', 'PIC', 'Tanggal'];

        // Table Header
        doc.font('Helvetica-Bold').fontSize(9);
        let currentX = 40;
        headers.forEach((h, i) => {
            doc.rect(currentX, tableTop, colWidths[i], 20).fill('#f3f4f6').stroke('#d1d5db');
            doc.fillColor('#000').text(h, currentX + 5, tableTop + 6, { width: colWidths[i] - 10 });
            currentX += colWidths[i];
        });

        let currentY = tableTop + 20;

        // Rows
        doc.font('Helvetica').fontSize(8);
        submissions.forEach((s) => {
            if (currentY > 500) { // Page break
                doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
                currentY = 40;
            }

            currentX = 40;
            const rowHeight = 20;

            const rowData = [
                s.tracking_code,
                `${s.applicant_name}\n${s.applicant_email}`,
                s.services.name,
                s.status,
                s.users?.name || '-',
                s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'
            ];

            rowData.forEach((data, i) => {
                doc.rect(currentX, currentY, colWidths[i], rowHeight).stroke('#e5e7eb');
                doc.text(data, currentX + 5, currentY + 5, { width: colWidths[i] - 10, height: rowHeight - 5 });
                currentX += colWidths[i];
            });

            currentY += rowHeight;
        });

        doc.end();
    });
}
