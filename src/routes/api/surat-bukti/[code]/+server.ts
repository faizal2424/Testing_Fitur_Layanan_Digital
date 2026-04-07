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
        if (err?.status) throw err;
        console.error('PDF generation error:', err);
        return json({ message: 'Gagal generate PDF', error: err?.message }, { status: 500 });
    }
};

// ── Color palette (Minimalist/Grayscale) ──
const COLORS = {
    primary: '#000000',       // Pure black for titles
    primaryLight: '#333333',  // Dark gray for subheadings
    accent: '#4A5568',        // Slate gray accent
    accentLight: '#A0AEC0',   // Light gray accent
    dark: '#1A202C',          // Near black
    text: '#2D3748',          // Dark gray text
    textLight: '#718096',     // Medium gray text
    border: '#E2E8F0',        // Subtle light border
    bgLight: '#F7FAFC',       // Very light bg
    bgRow: '#F9FAFB',         // Ultra light row highlight (minimalist)
    white: '#FFFFFF',
    success: '#2D3748',       // Keep it dark for minimalism
    successBg: '#F7FAFC',
    red: '#000000',           // Minimalist: use black instead of red
};

async function generateSuratBukti(submission: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 30, bottom: 40, left: 50, right: 50 }
        });

        const chunks: Uint8Array[] = [];
        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const PW = doc.page.width;   // 595.28
        const PH = doc.page.height;  // 841.89
        const ML = 50;               // margin left
        const MR = 50;               // margin right
        const CW = PW - ML - MR;     // content width

        // Prevent PDFKit from auto-creating pages
        // We intercept addPage and only allow it when we explicitly set the flag
        let allowAddPage = false;
        const _origAddPage = doc.addPage.bind(doc);
        doc.addPage = function(...args: any[]) {
            if (allowAddPage) {
                allowAddPage = false;
                return _origAddPage(...args);
            }
            // Auto-pagination blocked — just return doc
            return doc;
        };

        // Helper to explicitly add a page
        const addPage = () => {
            allowAddPage = true;
            doc.addPage();
        };
        // Register fonts
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
        const F = hasCustomFonts ? 'TimesRoman' : 'Times-Roman';
        const FB = hasCustomFonts ? 'TimesRoman-Bold' : 'Times-Bold';
        const FI = hasCustomFonts ? 'TimesRoman-Italic' : 'Times-Italic';
        const FH = 'Helvetica';
        const FHB = 'Helvetica-Bold';



        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  HEADER — Official Letterhead (Unified Centering)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        // ── 1. Calculate Dimensions for Unified Centering ──
        const logoWidth = 62;
        const hGap = 20; // Gap between logo and text

        const l1 = 'PEMERINTAH KABUPATEN SEMARANG';
        const l2 = 'DINAS KOMUNIKASI DAN INFORMATIKA';
        const l3 = 'Gedung Sekretariat Daerah Kabupaten Semarang';
        const l4 = 'Jl. Diponegoro No. 14, Ungaran, Kab. Semarang 50511';
        const l5 = 'Situs web: www.semarangkab.go.id | Email: diskominfo@semarangkab.go.id';

        // Calculate widths for each line to find the widest part of the text block
        doc.font(FB).fontSize(14);
        const w1 = doc.widthOfString(l1);
        doc.font(FB).fontSize(16);
        const w2 = doc.widthOfString(l2);
        doc.font(F).fontSize(9);
        const w3 = doc.widthOfString(l3);
        const w4 = doc.widthOfString(l4);
        const w5 = doc.widthOfString(l5);

        const maxTextWidth = Math.max(w1, w2, w3, w4, w5);
        const totalHeaderWidth = logoWidth + hGap + maxTextWidth;

        // Define our unified center horizontal starting point
        const hStartX = ML + (CW - totalHeaderWidth) / 2;
        const textStartX = hStartX + logoWidth + hGap;

        // ── 2. Draw Logo ──
        const logoPath = join(process.cwd(), 'static', 'img', 'logokabsmg.png');
        try {
            const logoData = readFileSync(logoPath);
            // Vertically center the logo with the main heading text block
            doc.image(logoData, hStartX, 32, { width: logoWidth });
        } catch {
            // skip
        }

        // ── 3. Draw Header Text (Each line centered within the text block) ──
        let y = 34;

        doc.fillColor(COLORS.primary).font(FB).fontSize(14);
        doc.text(l1, textStartX + (maxTextWidth - w1) / 2, y);

        y += 18;
        doc.fillColor(COLORS.primary).font(FB).fontSize(16);
        doc.text(l2, textStartX + (maxTextWidth - w2) / 2, y);

        y += 22;
        doc.fillColor(COLORS.primary).font(F).fontSize(9);
        doc.text(l3, textStartX + (maxTextWidth - w3) / 2, y);

        y += 12;
        doc.text(l4, textStartX + (maxTextWidth - w4) / 2, y);

        y += 12;
        doc.text(l5, textStartX + (maxTextWidth - w5) / 2, y);

        // ── Official Double Line (Classic "KOP" style) ──
        y += 18;
        doc.save();
        doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(2.5).strokeColor(COLORS.primary).stroke();
        doc.moveTo(ML, y + 3.5).lineTo(PW - MR, y + 3.5).lineWidth(0.8).strokeColor(COLORS.primary).stroke();
        doc.restore();

        y += 14; 


        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  DOCUMENT TITLE SECTION
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y += 25;

        doc.fillColor(COLORS.primary).font(FHB).fontSize(15);
        doc.text('TANDA TERIMA PENGAJUAN LAYANAN', ML, y, {
            width: CW, align: 'center', lineBreak: false
        });

        // Nomor
        y += 18;
        const year = new Date(submission.created_at || Date.now()).getFullYear();
        doc.fillColor(COLORS.primary).font(F).fontSize(10);
        doc.text(`Nomor: ${submission.tracking_code}/DIG-SRVC/${year}`, ML, y, {
            width: CW, align: 'center', lineBreak: false
        });


        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  INTRO TEXT
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y += 30;
        doc.fillColor(COLORS.primary).font(F).fontSize(11);
        const introText = 'Telah diterima data pengajuan layanan digital melalui sistem Layanan Digital Kabupaten Semarang dengan rincian sebagai berikut:';
        doc.text(introText, ML, y, {
            width: CW, lineGap: 2, lineBreak: false
        });
        const introH = doc.heightOfString(introText, { width: CW, lineGap: 2 });
        y += introH + 15;


        // INFO TABLE — Official style (2 columns, solid boundaries)
        const tableX = ML;
        const tableW = CW;
        const colLabel = 160;
        const rowH = 22;
        const padX = 10;
        const padY = 6;

        const infoRows: [string, string][] = [
            ['Kode Pengajuan', submission.tracking_code],
            ['Jenis Layanan', submission.services?.name || '-'],
            ['Nama Pemohon', submission.applicant_name || '-'],
            ['Email Pemohon', submission.applicant_email || '-'],
            ['Waktu Pengajuan', submission.created_at ? formatDateIndo(new Date(submission.created_at)) : '-'],
        ];

        for (let i = 0; i < infoRows.length; i++) {
            const [label, value] = infoRows[i];
            
            // Draw row boundary
            doc.save();
            doc.rect(tableX, y, tableW, rowH).lineWidth(0.8).strokeColor(COLORS.primary).stroke();
            // middle divider
            doc.moveTo(tableX + colLabel, y).lineTo(tableX + colLabel, y + rowH).stroke();
            doc.restore();

            // Label
            doc.fillColor(COLORS.primary).font(FB).fontSize(10);
            doc.text(label, tableX + padX, y + padY, { width: colLabel - padX, lineBreak: false });

            // Value
            doc.fillColor(COLORS.primary).font(F).fontSize(10);
            doc.text(value, tableX + colLabel + padX, y + padY, { width: tableW - colLabel - padX, lineBreak: false });

            y += rowH;
        }


        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  DETAIL ISIAN FORMULIR
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const fieldValues = (submission.service_submission_values || []).sort((a: any, b: any) => {
            const orderA = a.service_form_fields?.order ?? 0;
            const orderB = b.service_form_fields?.order ?? 0;
            return orderA - orderB;
        });

        if (fieldValues.length > 0) {
            y += 25;

            doc.fillColor(COLORS.primary).font(FHB).fontSize(11);
            doc.text('Rincian Data Isian:', ML, y);
            y += 18;

            // Detail values with two-column layout (Label | Value) to match top info table
            for (let i = 0; i < fieldValues.length; i++) {
                const sv = fieldValues[i];
                const fieldLabel = sv.service_form_fields?.label || 'Field';
                const fieldValue = sv.value || (sv.file_path ? '[File Terlampir]' : '-');

                // Dynamic height calculation (Width: tableW - colLabel - padding)
                const valH = doc.font(F).fontSize(9.5).heightOfString(fieldValue, { width: tableW - colLabel - padX * 2 });
                const cellH = Math.max(rowH, valH + 12);

                if (y + cellH > PH - 80) {
                    addPage();
                    y = 40;
                }

                doc.save();
                doc.rect(tableX, y, tableW, cellH).lineWidth(0.8).strokeColor(COLORS.primary).stroke();
                // middle divider (matches top table divider at colLabel)
                doc.moveTo(tableX + colLabel, y).lineTo(tableX + colLabel, y + cellH).stroke();
                doc.restore();

                doc.fillColor(COLORS.primary).font(FB).fontSize(9.5);
                doc.text(fieldLabel, tableX + padX, y + padY, { width: colLabel - padX });

                doc.fillColor(COLORS.primary).font(F).fontSize(9.5);
                doc.text(fieldValue, tableX + colLabel + padX, y + padY, { width: tableW - colLabel - padX * 2 });

                y += cellH;
            }
        }


        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  CLOSING PARAGRAPH
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y += 18;
        if (y > PH - 180) {
            addPage();
            y = 40;
        }

        const closingText = 'Demikian surat bukti pengajuan ini dibuat. Kode pengajuan di atas dapat digunakan untuk memantau status layanan melalui sistem Layanan Digital APTIKA Dinas Komunikasi dan Informatika Kabupaten Semarang.';
        doc.fillColor(COLORS.text).font(F).fontSize(10);
        doc.text(closingText, ML, y, { width: CW, lineGap: 2, lineBreak: false });
        const closingH = doc.heightOfString(closingText, { width: CW, lineGap: 2 });
        y += closingH;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  SIGNATURE AREA
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y += 25;
        if (y > PH - 130) {
            addPage();
            y = 40;
        }

        const signX = PW - MR - 210;
        const dateTxt = formatDateIndoLong(submission.created_at ? new Date(submission.created_at) : new Date());

        doc.fillColor(COLORS.text).font(F).fontSize(10);
        doc.text(`Ungaran, ${dateTxt}`, signX, y, { width: 210, lineBreak: false });

        y += 14;
        doc.fillColor(COLORS.primary).font(FHB).fontSize(10);
        doc.text('Dinas Komunikasi dan Informatika', signX, y, { width: 210, lineBreak: false });
        doc.fillColor(COLORS.text).font(F).fontSize(10);
        doc.text('Kabupaten Semarang', signX, y + 13, { width: 210, lineBreak: false });

        y += 55;
        // Signature line (no system name as requested)
        y += 4;
        // Space reserved for potential manual signature or just a clean ending

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  FOOTER
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const footY = PH - 38;

        // Minimalist footer line
        doc.save();
        doc.moveTo(ML, footY).lineTo(PW - MR, footY)
            .lineWidth(0.8).strokeColor(COLORS.border).stroke();
        doc.restore();

        doc.fillColor(COLORS.textLight).font(FI).fontSize(7);
        doc.text(
            'Dokumen ini digenerate secara otomatis oleh Sistem Layanan Digital APTIKA — Dinas Komunikasi dan Informatika Kabupaten Semarang',
            ML, footY + 6, { width: CW, align: 'center', lineBreak: false }
        );

        // ── Watermark (subtle diagonal lines on current page) ──
        doc.save();
        doc.opacity(0.035);
        doc.strokeColor(COLORS.primary);
        doc.lineWidth(0.3);
        for (let i = -8; i <= 8; i++) {
            const cx = PW / 2 + i * 50;
            const cy = PH / 2;
            doc.moveTo(cx - 20, cy - 20).lineTo(cx + 20, cy + 20).stroke();
            doc.moveTo(cx + 20, cy - 20).lineTo(cx - 20, cy + 20).stroke();
        }
        doc.restore();

        doc.end();
    });
}



function formatDateIndo(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}-${month}-${year} pukul ${hours}:${minutes} WIB`;
}

function formatDateIndoLong(date: Date): string {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
