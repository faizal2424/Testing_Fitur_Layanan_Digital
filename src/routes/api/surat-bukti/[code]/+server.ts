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

// ── Color palette ──
const COLORS = {
    primary: '#1B3A5C',       // Dark navy blue
    primaryLight: '#2C5282',  // Medium blue
    accent: '#C6993A',        // Gold accent
    accentLight: '#D4A84B',   // Light gold
    dark: '#1A202C',          // Near black
    text: '#2D3748',          // Dark gray text
    textLight: '#718096',     // Medium gray text
    border: '#CBD5E0',        // Light border
    bgLight: '#F7FAFC',       // Very light bg
    bgRow: '#EDF2F7',         // Row highlight
    white: '#FFFFFF',
    success: '#276749',       // Green for status
    successBg: '#F0FFF4',     // Light green bg
    red: '#C53030',           // Red accent
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
        //  HEADER BACKGROUND — navy blue band
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const headerH = 105;
        doc.save();
        doc.rect(20, 20, PW - 40, headerH)
            .fill(COLORS.primary);
        // Gold bottom accent line
        doc.rect(20, 20 + headerH, PW - 40, 3)
            .fill(COLORS.accent);
        doc.restore();

        // ── Logo on header ──
        const logoPath = join(process.cwd(), 'static', 'img', 'logokabsmg.png');
        try {
            const logoData = readFileSync(logoPath);
            doc.image(logoData, 38, 30, { width: 62 });
        } catch {
            // skip
        }

        // ── Header Text (white on blue) ──
        let y = 32;
        const hdrX = 110;
        const hdrW = PW - hdrX - 60;

        doc.fillColor(COLORS.white).font(FHB).fontSize(11.5);
        doc.text('PEMERINTAH DAERAH KABUPATEN SEMARANG', hdrX, y, {
            width: hdrW, align: 'center', lineBreak: false
        });

        y += 16;
        doc.fillColor(COLORS.white).font(FHB).fontSize(13);
        doc.text('DINAS KOMUNIKASI DAN INFORMATIKA', hdrX, y, {
            width: hdrW, align: 'center', lineBreak: false
        });

        y += 20;
        doc.fillColor('#CBD5E0').font(FH).fontSize(7.5);
        doc.text('Jl. Diponegoro No. 14, Gedung D, Ungaran, Kab. Semarang 50511', hdrX, y, {
            width: hdrW, align: 'center', lineBreak: false
        });
        y += 11;
        doc.text('Telp: (024) 76901553  |  diskominfo.semarangkab.go.id  |  kominfo@semarangkab.go.id', hdrX, y, {
            width: hdrW, align: 'center', lineBreak: false
        });

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  DOCUMENT TITLE SECTION
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y = 20 + headerH + 3 + 22; // after header + gold line + spacing

        doc.fillColor(COLORS.primary).font(FHB).fontSize(15);
        doc.text('SURAT BUKTI PENGAJUAN LAYANAN', ML, y, {
            width: CW, align: 'center', lineBreak: false
        });

        // Decorative underline below title
        y += 20;
        const titleLineW = 180;
        const titleLineCx = PW / 2;
        doc.save();
        doc.moveTo(titleLineCx - titleLineW / 2, y)
            .lineTo(titleLineCx + titleLineW / 2, y)
            .lineWidth(2)
            .strokeColor(COLORS.accent)
            .stroke();
        // small diamond in middle
        const dy = y;
        doc.moveTo(titleLineCx, dy - 4)
            .lineTo(titleLineCx + 4, dy)
            .lineTo(titleLineCx, dy + 4)
            .lineTo(titleLineCx - 4, dy)
            .fill(COLORS.accent);
        doc.restore();

        // ── Nomor Surat ──
        y += 14;
        doc.fillColor(COLORS.textLight).font(FH).fontSize(8.5);
        doc.text(`No: ${submission.tracking_code} / DISKOMINFO / ${new Date(submission.created_at || Date.now()).getFullYear()}`, ML, y, {
            width: CW, align: 'center', lineBreak: false
        });

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  INTRO TEXT
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y += 22;
        doc.fillColor(COLORS.text).font(F).fontSize(10.5);
        const introText = 'Dengan hormat, dengan ini menerangkan bahwa pengajuan layanan berikut telah diterima dan tercatat dalam sistem kami:';
        doc.text(introText, ML, y, {
            width: CW, lineGap: 2, lineBreak: false
        });
        // Calculate height manually
        const introH = doc.heightOfString(introText, { width: CW, lineGap: 2 });
        y += introH;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  TRACKING CODE HIGHLIGHT BOX
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y += 36;
        const codeBoxH = 52;
        const codeBoxW = 320;
        const codeBoxX = (PW - codeBoxW) / 2;

        doc.save();
        // bg
        doc.roundedRect(codeBoxX, y, codeBoxW, codeBoxH, 6)
            .fill(COLORS.bgLight);
        // border
        doc.roundedRect(codeBoxX, y, codeBoxW, codeBoxH, 6)
            .lineWidth(1.2)
            .strokeColor(COLORS.primary)
            .stroke();
        // left accent bar
        doc.rect(codeBoxX, y, 5, codeBoxH).fill(COLORS.accent);
        doc.restore();

        doc.fillColor(COLORS.textLight).font(FH).fontSize(7.5);
        doc.text('KODE PENGAJUAN', codeBoxX + 18, y + 10, { width: codeBoxW - 30, lineBreak: false });

        doc.fillColor(COLORS.primary).font(FHB).fontSize(18);
        doc.text(submission.tracking_code, codeBoxX + 18, y + 24, { width: codeBoxW - 30, lineBreak: false });

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  INFO TABLE — styled with alternating rows
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        y += codeBoxH + 18;

        // Section heading
        doc.save();
        doc.rect(ML, y, 4, 14).fill(COLORS.accent);
        doc.restore();
        doc.fillColor(COLORS.primary).font(FHB).fontSize(10.5);
        doc.text('INFORMASI PENGAJUAN', ML + 12, y + 1, { lineBreak: false });
        y += 22;

        const tableX = ML;
        const tableW = CW;
        const colLabel = 150;
        const rowH = 22;
        const padX = 10;

        const infoRows: [string, string][] = [
            ['Nama Pemohon', submission.applicant_name || '-'],
            ['Email Pemohon', submission.applicant_email || '-'],
            ['Layanan', submission.services?.name || '-'],
            ['Kode Pengajuan', submission.tracking_code],
            ['Tanggal Pengajuan', submission.created_at ? formatDateIndo(new Date(submission.created_at)) : '-'],
        ];

        // Table header
        doc.save();
        doc.rect(tableX, y, tableW, rowH).fill(COLORS.primary);
        doc.restore();
        doc.fillColor(COLORS.white).font(FHB).fontSize(8.5);
        doc.text('KETERANGAN', tableX + padX, y + 6, { width: colLabel, lineBreak: false });
        doc.text('DETAIL', tableX + colLabel + padX, y + 6, { width: tableW - colLabel - padX * 2, lineBreak: false });
        y += rowH;

        // Table rows
        for (let i = 0; i < infoRows.length; i++) {
            const [label, value] = infoRows[i];
            const isAlt = i % 2 === 0;

            doc.save();
            doc.rect(tableX, y, tableW, rowH).fill(isAlt ? COLORS.bgRow : COLORS.white);
            // left border accent
            doc.rect(tableX, y, 2, rowH).fill(COLORS.accent);
            // right border accent
            doc.rect(tableX + tableW - 2, y, 2, rowH).fill(COLORS.accent);
            doc.restore();

            // bottom line
            doc.save();
            doc.moveTo(tableX, y + rowH).lineTo(tableX + tableW, y + rowH)
                .lineWidth(0.3).strokeColor(COLORS.border).stroke();
            doc.restore();

            doc.fillColor(COLORS.textLight).font(FH).fontSize(8.5);
            doc.text(label, tableX + padX, y + 6, { width: colLabel - padX, lineBreak: false });

            if (label === 'Kode Pengajuan') {
                doc.fillColor(COLORS.primary).font(FHB).fontSize(9);
                doc.text(value, tableX + colLabel + padX, y + 6, { width: tableW - colLabel - padX * 2, lineBreak: false });
            } else {
                doc.fillColor(COLORS.dark).font(FH).fontSize(8.5);
                doc.text(value, tableX + colLabel + padX, y + 6, { width: tableW - colLabel - padX * 2, lineBreak: false });
            }

            y += rowH;
        }

        // Table bottom border
        doc.save();
        doc.moveTo(tableX, y).lineTo(tableX + tableW, y)
            .lineWidth(1.5).strokeColor(COLORS.primary).stroke();
        doc.restore();

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  DETAIL ISIAN FORMULIR
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const fieldValues = submission.service_submission_values || [];
        if (fieldValues.length > 0) {
            y += 18;

            // Check page space
            if (y > PH - 200) {
                addPage();
                y = 40;
            }

            doc.save();
            doc.rect(ML, y, 4, 14).fill(COLORS.accent);
            doc.restore();
            doc.fillColor(COLORS.primary).font(FHB).fontSize(10.5);
            doc.text('DETAIL ISIAN FORMULIR', ML + 12, y + 1, { lineBreak: false });
            y += 22;

            // Detail table header
            doc.save();
            doc.rect(tableX, y, tableW, rowH).fill(COLORS.primaryLight);
            doc.restore();
            doc.fillColor(COLORS.white).font(FHB).fontSize(8.5);
            doc.text('NO', tableX + padX, y + 6, { width: 25, lineBreak: false });
            doc.text('FIELD', tableX + 35 + padX, y + 6, { width: colLabel - 35, lineBreak: false });
            doc.text('NILAI', tableX + colLabel + padX, y + 6, { width: tableW - colLabel - padX * 2, lineBreak: false });
            y += rowH;

            for (let i = 0; i < fieldValues.length; i++) {
                const sv = fieldValues[i];
                const fieldLabel = sv.service_form_fields?.label || 'Field';
                const fieldValue = sv.value || (sv.file_path ? '[File Terlampir]' : '-');

                if (y > PH - 80) {
                    addPage();
                    y = 40;
                }

                const isAlt = i % 2 === 0;
                const valH = doc.font(FH).fontSize(8).heightOfString(fieldValue, { width: tableW - colLabel - padX * 2 - 10 });
                const cellH = Math.max(rowH, valH + 12);

                doc.save();
                doc.rect(tableX, y, tableW, cellH).fill(isAlt ? COLORS.bgRow : COLORS.white);
                doc.moveTo(tableX, y + cellH).lineTo(tableX + tableW, y + cellH)
                    .lineWidth(0.3).strokeColor(COLORS.border).stroke();
                doc.restore();

                doc.fillColor(COLORS.textLight).font(FH).fontSize(8);
                doc.text(`${i + 1}.`, tableX + padX, y + 6, { width: 25, lineBreak: false });
                doc.fillColor(COLORS.text).font(FHB).fontSize(8);
                doc.text(fieldLabel, tableX + 35 + padX, y + 6, { width: colLabel - 35 - padX, lineBreak: false });
                doc.fillColor(COLORS.dark).font(FH).fontSize(8);
                doc.text(fieldValue, tableX + colLabel + padX, y + 6, { width: tableW - colLabel - padX * 2, lineBreak: false });

                y += cellH;
            }

            // Table bottom
            doc.save();
            doc.moveTo(tableX, y).lineTo(tableX + tableW, y)
                .lineWidth(1).strokeColor(COLORS.primaryLight).stroke();
            doc.restore();
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
        doc.save();
        doc.moveTo(signX, y).lineTo(signX + 160, y)
            .lineWidth(0.5).strokeColor(COLORS.border).stroke();
        doc.restore();
        y += 4;
        doc.fillColor(COLORS.primary).font(FHB).fontSize(10);
        doc.text('Sistem Digital APTIKA', signX, y, { width: 210, lineBreak: false });

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  FOOTER
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const footY = PH - 38;

        // Gold accent line
        doc.save();
        doc.moveTo(ML, footY).lineTo(PW - MR, footY)
            .lineWidth(1.2).strokeColor(COLORS.accent).stroke();
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
