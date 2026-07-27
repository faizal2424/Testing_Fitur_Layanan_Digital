import { Hono } from 'hono';
import type { Context } from 'hono';
import { db } from '../lib/db.js';

const tracking = new Hono();

// Status labels (sama dengan submissionFlow.ts di frontend)
const statusLabels: Record<string, string> = {
  baru: 'Diterima',
  revisi: 'Perlu Revisi',
  ditugaskan: 'Verifikasi',
  diproses_pic: 'Proses',
  diselesaikan_pic: 'Validasi',
  selesai: 'Selesai',
  ditolak_pengajuan: 'Pengajuan Ditangguhkan',
  ditolak_pic: 'Ditolak PIC',
  disetujui_pic: 'Disetujui PIC'
};

// ============================================================
// GET /api/tracking/:code
// Endpoint publik — tidak perlu autentikasi
// Returns: status dan info pengajuan berdasarkan tracking code
// ============================================================
tracking.get('/:code', async (c: Context) => {
  const code = c.req.param('code')?.trim();

  if (!code) {
    return c.json({ success: false, error: 'Kode tracking tidak boleh kosong.' }, 400);
  }

  try {
    const pengajuan = await db.service_submissions.findUnique({
      where: { tracking_code: code },
      include: {
        services: { select: { name: true, icon: true } },
        users: { select: { name: true, phone: true } },
        agencies: { select: { name: true } },
        submission_notes: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            note: true,
            status_from: true,
            status_to: true,
            created_at: true
          }
        }
      }
    });

    if (!pengajuan) {
      return c.json(
        { success: false, error: 'Data tidak ditemukan. Pastikan kode tracking benar.' },
        404
      );
    }

    const lastNote = pengajuan.submission_notes[0];

    return c.json({
      success: true,
      data: {
        tracking_code: pengajuan.tracking_code,
        status: pengajuan.status,
        status_label: statusLabels[pengajuan.status] || pengajuan.status,
        applicant_name: pengajuan.applicant_name || '-',
        applicant_email: pengajuan.applicant_email || '-',
        service_name: pengajuan.services.name,
        service_icon: pengajuan.services.icon,
        agency_name: pengajuan.agencies?.name || null,
        pic_name: pengajuan.users?.name || 'Menunggu Penugasan',
        pic_phone: pengajuan.users?.phone || null,
        is_priority: pengajuan.is_priority,
        created_at: pengajuan.created_at?.toISOString() || null,
        updated_at: pengajuan.updated_at?.toISOString() || null,
        last_note: lastNote
          ? {
              note: lastNote.note,
              status_from: lastNote.status_from,
              status_to: lastNote.status_to,
              created_at: lastNote.created_at?.toISOString() || null
            }
          : null
      }
    });
  } catch (err) {
    console.error('[Tracking] Error:', err);
    return c.json({ success: false, error: 'Terjadi kesalahan pada server.' }, 500);
  }
});

export { tracking };
