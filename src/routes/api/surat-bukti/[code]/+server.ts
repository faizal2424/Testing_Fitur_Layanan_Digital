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
                agencies: true,
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

// ── Color palette (Strictly Black & White) ──
const COLORS = {
    primary: '#000000',       // Pure black
    secondary: '#000000',     // Pure black
    accent: '#000000',        // Pure black
    text: '#000000',          // Pure black
    textLight: '#444444',     // Dark gray for sub-labels
    border: '#000000',        // Black border
    bgHeader: '#F2F2F2',      // Very light gray for visibility
    bgRow: '#FFFFFF',         // White row
    bgAlt: '#FAFAFA',         // Very light alt row (almost white)
    white: '#FFFFFF',
    black: '#000000',
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

        const PW = doc.page.width;   
        const PH = doc.page.height;  
        const ML = 50;               
        const MR = 50;               
        const CW = PW - ML - MR;     

        // Prevent PDFKit from auto-creating pages to allow manual control
        let allowAddPage = false;
        const _origAddPage = doc.addPage.bind(doc);
        doc.addPage = function(...args: any[]) {
            if (allowAddPage) {
                allowAddPage = false;
                return _origAddPage(...args);
            }
            return doc;
        };

        const addPage = () => {
            allowAddPage = true;
            const newPage = doc.addPage();
            // Reset Y for new page
            return newPage;
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

        // Logo proporsional, ditempatkan di kiri
        const logoWidth = 78;
        const logoX = ML; // Mulai dari margin kiri (50)
        const headerTopY = 25;
        const hGap = 15;

        const a = submission.agencies || {};
        const l1 = 'PEMERINTAH DAERAH KABUPATEN SEMARANG';
        const l2 = a.name ? a.name.toUpperCase() : 'DINAS KOMUNIKASI DAN INFORMATIKA';
        const address = a.address || 'Jl. Gatot Subroto No.104 A, Cirebonan, Bandarjo, Kec. Ungaran Barat Kabupaten Semarang, Jawa Tengah';
        const phone = a.phone || '(024) 76901553';
        const website = a.website || 'diskominfo.semarangkab.go.id';
        const email = a.email || 'kominfo@semarangkab.go.id';
        const postalCode = a.postal_code || '50517';

        // Area teks dimulai setelah logo
        const textStartX = logoX + logoWidth + hGap;
        const availableTextW = CW - logoWidth - hGap;

        // Logo
        const logoPath = join(process.cwd(), 'static', 'img', 'logokabsmg.png');
        try {
            const logoData = readFileSync(logoPath);
            doc.image(logoData, logoX, headerTopY, { width: logoWidth });
        } catch {}

        let y = headerTopY + 2;
        doc.fillColor(COLORS.primary).font(FB).fontSize(14);
        doc.text(l1, textStartX, y, { width: availableTextW, align: 'center' });
        
        y += 18;
        doc.fillColor(COLORS.primary).font(FB).fontSize(20);
        doc.text(l2, textStartX, y, { width: availableTextW, align: 'center' });
        y += doc.heightOfString(l2, { width: availableTextW, align: 'center' }) + 4;
        
        doc.fillColor(COLORS.primary).font(F).fontSize(9.5);
        
        const textAddress = `Alamat : ${address}`;
        doc.text(textAddress, textStartX, y, { width: availableTextW, align: 'center' });
        y += doc.heightOfString(textAddress, { width: availableTextW, align: 'center' }) + 1.5;
        
        doc.text(`No. Tlp: ${phone}`, textStartX, y, { width: availableTextW, align: 'center' });
        y += 11;
        
        doc.text(`Website : ${website}, E-mail : ${email}`, textStartX, y, { width: availableTextW, align: 'center' });
        y += 11;
        
        doc.text(`Kode pos : ${postalCode}`, textStartX, y, { width: availableTextW, align: 'center' });
        y += 11;

        // Official Double Line
        y += 15;
        doc.save().moveTo(ML, y).lineTo(PW - MR, y).lineWidth(2).strokeColor(COLORS.black).stroke();
        doc.moveTo(ML, y + 2.5).lineTo(PW - MR, y + 2.5).lineWidth(0.5).strokeColor(COLORS.black).stroke().restore();

        y += 25;



        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  TITLE & TRACKING CODE SECTION
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        doc.fillColor(COLORS.primary).font(FHB).fontSize(16);
        doc.text('TANDA TERIMA PENGAJUAN LAYANAN', ML, y, { width: CW, align: 'center' });
        
        y += 36;

        // ── Highlight Summary Box ──
        const summaryY = y;
        
        // Top separator line for summary
        doc.save();
        doc.rect(ML, summaryY, CW, 45).fillColor('#F5F5F5').fill();
        doc.moveTo(ML, summaryY).lineTo(PW - MR, summaryY).lineWidth(0.5).strokeColor(COLORS.black).stroke();
        doc.restore();

        // Left: Tracking Code
        doc.fillColor(COLORS.textLight).font(F).fontSize(8);
        doc.text('KODE TRACKING / PENGAJUAN', ML, summaryY + 10);
        doc.fillColor(COLORS.primary).font(FHB).fontSize(13);
        doc.text(submission.tracking_code, ML, summaryY + 22);

        // Center: Status
        // Move status to the left to avoid overlapping
        const statusX = ML + 220; 
        doc.fillColor(COLORS.textLight).font(F).fontSize(8);
        doc.text('STATUS DOKUMEN', statusX, summaryY + 10);
        doc.fillColor(COLORS.primary).font(FB).fontSize(11);
        doc.text('DITERIMA / TERSIMPAN', statusX, summaryY + 22);

        // Right: Date
        // Using right-aligned approach for Year to ensure it sits cleanly at the edge
        const yearStr = new Date(submission.created_at || Date.now()).getFullYear().toString();
        const dateX = PW - MR - 60;
        doc.fillColor(COLORS.textLight).font(F).fontSize(8);
        doc.text('TAHUN', dateX, summaryY + 10);
        doc.fillColor(COLORS.primary).font(FB).fontSize(11);
        doc.text(yearStr, dateX, summaryY + 22);

        const summaryBottomY = summaryY + 45;
        // Bottom separator line for summary
        doc.save();
        doc.moveTo(ML, summaryBottomY).lineTo(PW - MR, summaryBottomY).lineWidth(0.5).strokeColor(COLORS.black).stroke();
        doc.restore();

        y = summaryBottomY + 25;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  BASIC INFORMATION TABLE
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        doc.fillColor(COLORS.primary).font(FHB).fontSize(11);
        doc.text('Informasi Dasar Pemohon', ML, y);
        y += 18;

        const infoRows: [string, string][] = [
            ['Jenis Layanan', submission.services?.name || '-'],
            ['Nama Pemohon', submission.applicant_name || '-'],
            ['Email Pemohon', submission.applicant_email || '-'],
            ['Waktu Pengajuan', submission.created_at ? formatDateIndo(new Date(submission.created_at)) : '-'],
        ];

        const colLabel = 140;
        const rowH = 22;
        const padX = 10;
        const padY = 6;

        for (const [label, value] of infoRows) {
            doc.save();
            doc.rect(ML, y, CW, rowH).fillColor('#F5F5F5').fill();
            doc.rect(ML, y, CW, rowH).lineWidth(0.5).strokeColor(COLORS.border).stroke();
            doc.moveTo(ML + colLabel, y).lineTo(ML + colLabel, y + rowH).stroke();
            doc.restore();

            doc.fillColor(COLORS.textLight).font(FB).fontSize(9);
            doc.text(label, ML + padX, y + padY);
            doc.fillColor(COLORS.primary).font(F).fontSize(10);
            doc.text(value, ML + colLabel + padX, y + padY, { width: CW - colLabel - padX * 2 });

            y += rowH;
        }

        y += 30;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  DETAILED FORM DATA (Dynamic Table)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const fieldValues = (submission.service_submission_values || []).sort((a: any, b: any) => {
            const orderA = a.service_form_fields?.order ?? 0;
            const orderB = b.service_form_fields?.order ?? 0;
            return orderA - orderB;
        });

        if (fieldValues.length > 0) {
            doc.fillColor(COLORS.primary).font(FHB).fontSize(11);
            doc.text('Rincian Data Isian Formulir', ML, y);
            y += 15;



            for (let i = 0; i < fieldValues.length; i++) {
                const sv = fieldValues[i];
                const fieldLabel = sv.service_form_fields?.label || 'Field';
                const fieldValue = sv.value || (sv.file_path ? '[File Terlampir]' : '-');

                // Dynamic height calculation
                const valH = doc.font(F).fontSize(9.5).heightOfString(fieldValue, { width: CW - colLabel - padX * 2 });
                const cellH = Math.max(22, valH + 12);

                if (y + cellH > PH - 180) {
                    addPage();
                    y = 50;
                }

                doc.save();
                doc.rect(ML, y, CW, cellH).fillColor('#F5F5F5').fill();
                doc.rect(ML, y, CW, cellH).lineWidth(0.5).strokeColor(COLORS.border).stroke();
                doc.moveTo(ML + colLabel, y).lineTo(ML + colLabel, y + cellH).stroke();
                doc.restore();

                doc.fillColor(COLORS.secondary).font(FB).fontSize(9);
                doc.text(fieldLabel, ML + padX, y + padY, { width: colLabel - padX });

                doc.fillColor(COLORS.text).font(F).fontSize(9.5);
                doc.text(fieldValue, ML + colLabel + padX, y + padY, { width: CW - colLabel - padX * 2 });

                y += cellH;
            }
        }

        y += 30;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  NEXT STEPS / PETUNJUK
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (y > PH - 200) {
            addPage();
            y = 50;
        }

        doc.save();
        // Just add a line above instructions instead of a full box
        doc.moveTo(ML, y).lineTo(PW - MR, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
        doc.restore();
        y += 10;

        doc.fillColor(COLORS.accent).font(FB).fontSize(10);
        doc.text('LANGKAH BERIKUTNYA & PETUNJUK:', ML + 15, y + 12);
        
        doc.fillColor(COLORS.text).font(F).fontSize(9);
        const instructions = [
            '1. Simpan tanda terima ini sebagai bukti sah pengajuan layanan.',
            '2. Gunakan "Kode Tracking" untuk memantau status pengajuan secara berkala melalui portal.',
            '3. Admin akan melakukan verifikasi berkas dalam waktu 1-3 hari kerja.',
            '4. Notifikasi akan dikirimkan melalui email yang terdaftar jika status berubah.'
        ];
        
        let instY = y + 28;
        for (const inst of instructions) {
            doc.text(inst, ML + 15, instY);
            instY += 12;
        }

        y += 100;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  SIGNATURE & VERIFICATION AREA
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (y > PH - 140) {
            addPage();
            y = 50;
        }

        const signX = PW - MR - 210;
        const dateTxt = formatDateIndoLong(submission.created_at ? new Date(submission.created_at) : new Date());
        const agencySignName = submission.agencies?.name || 'Dinas Komunikasi dan Informatika';

        // Right side (Signature)
        doc.fillColor(COLORS.text).font(F).fontSize(10);
        doc.text(`Ungaran, ${dateTxt}`, signX, y, { width: 210 });
        y += 15;
        doc.fillColor(COLORS.primary).font(FB).fontSize(10);
        doc.text(agencySignName, signX, y, { width: 210 });
        y += doc.heightOfString(agencySignName, { width: 210 }) + 2;
        doc.text('Kabupaten Semarang', signX, y, { width: 210 });
        y += 45;
        doc.text('DICETAK SECARA DIGITAL', signX, y, { width: 210 });



        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  FOOTER
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const footY = PH - 38;
        doc.save().moveTo(ML, footY).lineTo(PW - MR, footY).lineWidth(0.5).strokeColor(COLORS.border).stroke().restore();

        doc.fillColor(COLORS.textLight).font(FI).fontSize(7);
        doc.text(
            'Dokumen ini digenerate secara otomatis oleh Sistem Layanan Digital APTIKA — Dinas Komunikasi dan Informatika Kabupaten Semarang',
            ML, footY + 8, { width: CW, align: 'center' }
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
    return `${day}-${month}-${year} pukul ${hours}:${minutes} WIB`;
}

function formatDateIndoLong(date: Date): string {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
