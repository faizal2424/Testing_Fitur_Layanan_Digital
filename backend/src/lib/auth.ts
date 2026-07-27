import { db } from './db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'session_id';
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE_SECONDS || '2592000'); // 30 hari

// ============================================================
// Password Verification (compatible dengan Laravel bcrypt)
// ============================================================
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// ============================================================
// Session Management
// ============================================================
export async function createSession(
  userId: bigint,
  c: Context,
  remember: boolean = false
): Promise<string> {
  const sessionId = crypto.randomBytes(40).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 hari atau 1 hari

  // Simpan session ke database (tabel sessions existing)
  await db.sessions.create({
    data: {
      id: sessionId,
      user_id: userId,
      ip_address: null,
      user_agent: null,
      payload: JSON.stringify({ user_id: userId.toString() }),
      last_activity: now
    }
  });

  // Set cookie — SameSite=None + Secure diperlukan untuk cross-origin
  const isProduction = process.env.NODE_ENV === 'production';
  setCookie(c, SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: isProduction ? 'None' : 'Lax',
    secure: isProduction,
    maxAge
  });

  return sessionId;
}

export async function destroySession(c: Context): Promise<void> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    try {
      await db.sessions.delete({ where: { id: sessionId } });
    } catch {
      // Session mungkin sudah terhapus, abaikan
    }
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
  }
}

export async function getSessionUser(c: Context) {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return null;

  try {
    const session = await db.sessions.findUnique({ where: { id: sessionId } });

    if (!session || !session.user_id) return null;

    // Cek apakah session sudah expired
    const now = Math.floor(Date.now() / 1000);
    if (now - session.last_activity > SESSION_MAX_AGE) {
      await db.sessions.delete({ where: { id: sessionId } });
      deleteCookie(c, SESSION_COOKIE, { path: '/' });
      return null;
    }

    // Update last_activity
    await db.sessions.update({
      where: { id: sessionId },
      data: { last_activity: now }
    });

    // Ambil user beserta role dan agency
    const user = await db.users.findUnique({
      where: { id: session.user_id },
      include: {
        user_roles: { include: { roles: true } },
        agencies: true
      }
    });

    if (!user) return null;

    const roleName =
      user.user_roles.length > 0 ? user.user_roles[0].roles.name.toLowerCase() : 'pic';

    return {
      id: user.id,
      name: user.name,
      username: user.username || '',
      email: user.email,
      phone: user.phone,
      role: roleName,
      agency_id: user.agency_id ? user.agency_id.toString() : null,
      agency_name: user.agencies ? user.agencies.name : null
    };
  } catch {
    return null;
  }
}

// ============================================================
// Captcha (simple math — untuk login form)
// ============================================================
export function generateCaptcha(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
}

// ============================================================
// Rate Limiting (in-memory, per IP)
// ============================================================
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 }); // 1 menit window
    return { allowed: true, remaining: 9 };
  }

  if (record.count >= 10) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: 10 - record.count };
}

// Bersihkan entri lama setiap menit
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now > record.resetAt) loginAttempts.delete(ip);
  }
}, 60000);
