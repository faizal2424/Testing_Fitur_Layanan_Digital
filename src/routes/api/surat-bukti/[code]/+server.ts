import { db } from '$lib/server/db';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PDFDocumentModule from 'pdfkit';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Handle ESM/CJS interop for pdfkit
const PDFDocument = (PDFDocumentModule as any).default || PDFDocumentModule;

export const GET: RequestHandler = async ({ params }) => {
    const { code } = params;

    try {
        // Fetch submission with related data
        const submission = await db.service_submissions.findUnique({
            where: { tracking_code: code },
            include: {
                services: true,
                service_submission_values: {
                    include: {
                        service_form_fields: true
                    }
                }
            }
        });

        if (!submission) {
            throw error(404, 'Pengajuan tidak ditemukan');
        }

        // Generate PDF
        const pdfBuffer = await generateSuratBukti(submission);

        return new Response(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="surat-bukti-pengajuan-${code}.pdf"`,
                'Content-Length': pdfBuffer.length.toString()
            }
        });
    } catch (err: any) {
        // Re-throw SvelteKit errors
        if (err?.status) throw err;
        console.error('PDF generation error:', err);
        return json({ message: 'Gagal generate PDF', error: err?.message }, { status: 500 });
    }
};

async function generateSuratBukti(submission: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 40, bottom: 50, left: 60, right: 60 }
        });

        const chunks: Uint8Array[] = [];
        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - 120; // margins

        // ── Register fonts ──
        const fontDir = join(process.cwd(), 'static', 'fonts');
        let hasCustomFonts = false;

        const fontFiles = {
            regular: join(fontDir, 'times.ttf'),
            bold: join(fontDir, 'timesbd.ttf'),
            italic: join(fontDir, 'timesi.ttf'),
            boldItalic: join(fontDir, 'timesbi.ttf')
        };

        try {
            if (existsSync(fontFiles.regular) && existsSync(fontFiles.bold) &&
                existsSync(fontFiles.italic) && existsSync(fontFiles.boldItalic)) {
                doc.registerFont('TimesRoman', fontFiles.regular);
                doc.registerFont('TimesRoman-Bold', fontFiles.bold);
                doc.registerFont('TimesRoman-Italic', fontFiles.italic);
                doc.registerFont('TimesRoman-BoldItalic', fontFiles.boldItalic);
                hasCustomFonts = true;
            }
        } catch {
            hasCustomFonts = false;
        }

        const fontRegular = hasCustomFonts ? 'TimesRoman' : 'Times-Roman';
        const fontBold = hasCustomFonts ? 'TimesRoman-Bold' : 'Times-Bold';
        const fontItalic = hasCustomFonts ? 'TimesRoman-Italic' : 'Times-Italic';

        // ── Logo ──
        const logoPath = join(process.cwd(), 'static', 'img', 'logokabsmg.png');
        try {
            const logoData = readFileSync(logoPath);
            doc.image(logoData, 65, 35, { width: 75 });
        } catch {
            // Skip logo if not available
        }

        // ── Kop Surat (Header) ──
        const headerX = 150;
        const headerWidth = pageWidth - 150 - 60;
        let yPos = 40;

        doc.font(fontBold).fontSize(13);
        doc.text('PEMERINTAH DAERAH KABUPATEN SEMARANG', headerX, yPos, {
            width: headerWidth,
            align: 'center'
        });

        yPos += 17;
        doc.font(fontBold).fontSize(14);
        doc.text('DINAS KOMUNIKASI DAN INFORMATIKA', headerX, yPos, {
            width: headerWidth,
            align: 'center'
        });

        yPos += 20;
        doc.font(fontRegular).fontSize(9);
        doc.text('Alamat: Jl. Diponegoro No. 14, Gedung D, Ungaran, Kab. Semarang', headerX, yPos, {
            width: headerWidth,
            align: 'center'
        });

        yPos += 12;
        doc.text('Telepon: (024) 76901553', headerX, yPos, {
            width: headerWidth,
            align: 'center'
        });

        yPos += 12;
        doc.text('Laman: diskominfo.semarangkab.go.id | Pos-el: kominfo@semarangkab.go.id', headerX, yPos, {
            width: headerWidth,
            align: 'center'
        });

        yPos += 12;
        doc.text('Kode Pos: 50511', headerX, yPos, {
            width: headerWidth,
            align: 'center'
        });

        // ── Garis pemisah ──
        yPos += 22;
        doc.moveTo(60, yPos).lineTo(pageWidth - 60, yPos).lineWidth(2.5).stroke('#000');
        doc.moveTo(60, yPos + 3).lineTo(pageWidth - 60, yPos + 3).lineWidth(0.8).stroke('#000');

        // ── Title ──
        yPos += 30;
        doc.font(fontBold).fontSize(14);
        doc.text('BUKTI PENGAJUAN LAYANAN', 60, yPos, {
            width: contentWidth,
            align: 'center',
            underline: true
        });

        // ── Body intro ──
        yPos += 40;
        doc.font(fontRegular).fontSize(11);
        doc.text('Dengan ini dinyatakan bahwa:', 60, yPos, {
            width: contentWidth
        });

        // ── Data Table ──
        yPos += 30;
        const labelX = 90;
        const colonX = 260;
        const valueX = 275;
        const lineHeight = 24;

        // Nama Pemohon
        doc.font(fontRegular).fontSize(11);
        doc.text('Nama Pemohon', labelX, yPos);
        doc.text(':', colonX, yPos);
        doc.font(fontBold).text(submission.applicant_name?.toUpperCase() || '-', valueX, yPos, {
            width: pageWidth - valueX - 60
        });

        // Email Pemohon
        yPos += lineHeight;
        doc.font(fontRegular).text('Email Pemohon', labelX, yPos);
        doc.text(':', colonX, yPos);
        doc.font(fontRegular).text(submission.applicant_email || '-', valueX, yPos, {
            width: pageWidth - valueX - 60
        });

        // Layanan
        yPos += lineHeight;
        doc.font(fontRegular).text('Layanan', labelX, yPos);
        doc.text(':', colonX, yPos);
        doc.font(fontRegular).text(submission.services?.name?.toUpperCase() || '-', valueX, yPos, {
            width: pageWidth - valueX - 60
        });

        // Kode Pengajuan
        yPos += lineHeight;
        doc.font(fontRegular).text('Kode Pengajuan', labelX, yPos);
        doc.text(':', colonX, yPos);
        doc.font(fontBold).text(submission.tracking_code, valueX, yPos, {
            width: pageWidth - valueX - 60
        });

        // Tanggal Pengajuan
        yPos += lineHeight;
        doc.font(fontRegular).text('Tanggal Pengajuan', labelX, yPos);
        doc.text(':', colonX, yPos);
        const createdAt = submission.created_at
            ? formatDateIndo(new Date(submission.created_at))
            : '-';
        doc.font(fontRegular).text(createdAt, valueX, yPos, {
            width: pageWidth - valueX - 60
        });

        // ── Detail Pengajuan (dynamic fields) ──
        const fieldValues = submission.service_submission_values || [];
        if (fieldValues.length > 0) {
            yPos += lineHeight + 15;
            doc.font(fontBold).fontSize(11);
            doc.text('Detail Isian Formulir:', 60, yPos, { width: contentWidth });

            yPos += 20;

            for (const sv of fieldValues) {
                const fieldLabel = sv.service_form_fields?.label || 'Field';
                const fieldValue = sv.value || (sv.file_path ? '[File Terlampir]' : '-');

                // Check if we need a new page
                if (yPos > doc.page.height - 100) {
                    doc.addPage();
                    yPos = 50;
                }

                doc.font(fontRegular).fontSize(10);
                doc.text(fieldLabel, labelX, yPos);
                doc.text(':', colonX, yPos);
                doc.font(fontRegular).text(fieldValue, valueX, yPos, {
                    width: pageWidth - valueX - 60
                });
                
                // Calculate actual height used by multi-line value
                const textHeight = doc.heightOfString(fieldValue, { width: pageWidth - valueX - 60 });
                yPos += Math.max(lineHeight, textHeight + 6);
            }
        }

        // ── Closing paragraph ──
        yPos += 20;

        // Check if we need a new page
        if (yPos > doc.page.height - 200) {
            doc.addPage();
            yPos = 50;
        }

        doc.font(fontRegular).fontSize(11);
        doc.text(
            'Telah melakukan pengajuan layanan resmi melalui ',
            60,
            yPos,
            { width: contentWidth, continued: true }
        );
        doc.font(fontBold).text(
            'Dinas Komunikasi dan Informatika Kabupaten Semarang',
            { continued: true }
        );
        doc.font(fontRegular).text(
            '. Kode pengajuan ini digunakan sebagai bukti dan referensi untuk pengecekan status lebih lanjut.'
        );

        // ── Signature area ──
        yPos = doc.y + 40;

        // Check if we need a new page for signature
        if (yPos > doc.page.height - 150) {
            doc.addPage();
            yPos = 50;
        }

        const signX = pageWidth - 260;
        doc.font(fontRegular).fontSize(11);
        doc.text(
            `Ungaran, ${formatDateIndoLong(submission.created_at ? new Date(submission.created_at) : new Date())}`,
            signX,
            yPos,
            { width: 200 }
        );

        yPos += 18;
        doc.font(fontBold).fontSize(11);
        doc.text('Dinas Komunikasi dan Informatika', signX, yPos, { width: 200 });
        doc.font(fontRegular).text('Kabupaten Semarang', signX, yPos + 14, { width: 200 });

        yPos += 70;
        doc.font(fontBold).fontSize(11);
        doc.text('Sistem Digital APTIKA', signX, yPos, { width: 200 });

        // ── Footer line ──
        const footerY = doc.page.height - 45;
        doc.moveTo(60, footerY).lineTo(pageWidth - 60, footerY).lineWidth(0.5).stroke('#999');
        doc.font(fontItalic).fontSize(8).fillColor('#666');
        doc.text(
            'Dokumen ini digenerate secara otomatis oleh Sistem Layanan Digital APTIKA Diskominfo Kab. Semarang',
            60,
            footerY + 6,
            { width: contentWidth, align: 'center' }
        );

        doc.end();
    });
}

function formatDateIndo(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function formatDateIndoLong(date: Date): string {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
