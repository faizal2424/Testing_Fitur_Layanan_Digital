import { Hono } from 'hono';
import type { Context } from 'hono';
import { db } from '../lib/db.js';
import { verifyPassword, createSession, destroySession, getSessionUser, checkRateLimit } from '../lib/auth.js';

const auth = new Hono();

// ============================================================
// POST /api/auth/login
// Body: { username, password, remember? }
// Returns: { success, user } + Set-Cookie session_id
// ============================================================
auth.post('/login', async (c: Context) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  // Rate limiting
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return c.json(
      { success: false, error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.' },
      429
    );
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Request body harus berupa JSON.' }, 400);
  }

  const username = body.username?.toString()?.trim() || '';
  const password = body.password?.toString() || '';
  const remember = body.remember === true || body.remember === 'true';

  // Validasi input
  if (!username || !password) {
    return c.json({ success: false, error: 'Username dan password wajib diisi.' }, 400);
  }

  // Cari user by username atau email
  const user = await db.users.findFirst({
    where: {
      OR: [{ username }, { email: username }]
    },
    include: {
      user_roles: { include: { roles: true } }
    }
  });

  if (!user) {
    return c.json({ success: false, error: 'Username atau password salah.' }, 401);
  }

  // Verifikasi password (compatible dengan Laravel bcrypt)
  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return c.json({ success: false, error: 'Username atau password salah.' }, 401);
  }

  // Buat session dan set cookie
  await createSession(user.id, c, remember);

  // Tentukan redirect path berdasarkan role
  const role = user.user_roles[0]?.roles.name.toLowerCase() || 'pic';
  const redirectPath = role === 'pic' ? '/admin/pengajuan' : '/admin';

  return c.json({
    success: true,
    user: {
      id: user.id.toString(),
      name: user.name,
      username: user.username || '',
      email: user.email,
      role,
      redirectPath
    }
  });
});

// ============================================================
// POST /api/auth/logout
// Menghapus session dari DB dan cookie
// ============================================================
auth.post('/logout', async (c: Context) => {
  await destroySession(c);
  return c.json({ success: true, message: 'Berhasil logout.' });
});

// ============================================================
// GET /api/auth/me
// Cek apakah user sedang login (untuk frontend SPA)
// ============================================================
auth.get('/me', async (c: Context) => {
  const user = await getSessionUser(c);

  if (!user) {
    return c.json({ authenticated: false, user: null }, 401);
  }

  return c.json({
    authenticated: true,
    user: {
      id: user.id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      agency_id: user.agency_id,
      agency_name: user.agency_name
    }
  });
});

export { auth };
