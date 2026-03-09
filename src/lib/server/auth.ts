import { db } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const SESSION_COOKIE = 'session_id';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days maximum session life

// ============================================================
// Password Verification (compatible with Laravel bcrypt)
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
export async function createSession(userId: bigint, cookies: Cookies, remember: boolean = false): Promise<string> {
	const sessionId = crypto.randomBytes(40).toString('hex');
	const now = Math.floor(Date.now() / 1000);
	const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days or 1 day

	// Store session in database (using the existing sessions table)
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

	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false, // set to true in production with HTTPS
		maxAge: maxAge
	});

	return sessionId;
}

export async function destroySession(cookies: Cookies): Promise<void> {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (sessionId) {
		try {
			await db.sessions.delete({ where: { id: sessionId } });
		} catch {
			// Session might already be deleted
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
	}
}

export async function getSessionUser(cookies: Cookies) {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (!sessionId) return null;

	try {
		const session = await db.sessions.findUnique({
			where: { id: sessionId }
		});

		if (!session || !session.user_id) return null;

		// Check if session is expired (7 days)
		const now = Math.floor(Date.now() / 1000);
		if (now - session.last_activity > SESSION_MAX_AGE) {
			await db.sessions.delete({ where: { id: sessionId } });
			cookies.delete(SESSION_COOKIE, { path: '/' });
			return null;
		}

		// Update last activity
		await db.sessions.update({
			where: { id: sessionId },
			data: { last_activity: now }
		});

		// Get user with role
		const user = await db.users.findUnique({
			where: { id: session.user_id },
			include: {
				user_roles: {
					include: {
						roles: true
					}
				}
			}
		});

		if (!user) return null;

		// Extract role name (take the first role, or default to 'pic')
		const roleName = user.user_roles.length > 0
			? user.user_roles[0].roles.name.toLowerCase()
			: 'pic';

		return {
			id: user.id,
			name: user.name,
			username: user.username || '',
			email: user.email,
			phone: user.phone,
			role: roleName
		};
	} catch {
		return null;
	}
}
export function requireAdmin(event: any) {
  const user = event.locals.user;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    throw redirect(302, '/mlebet');
  }
}

// ============================================================
// Captcha (simple math)
// ============================================================
export function generateCaptcha(): { question: string; answer: number } {
	const a = Math.floor(Math.random() * 20) + 1;
	const b = Math.floor(Math.random() * 20) + 1;
	return {
		question: `${a} + ${b} = ?`,
		answer: a + b
	};
}

// ============================================================
// Rate Limiting (in-memory)
// ============================================================
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
	const now = Date.now();
	const record = loginAttempts.get(ip);

	if (!record || now > record.resetAt) {
		loginAttempts.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
		return { allowed: true, remaining: 9 };
	}

	if (record.count >= 10) {
		return { allowed: false, remaining: 0 };
	}

	record.count++;
	return { allowed: true, remaining: 10 - record.count };
}

// Clean up old entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [ip, record] of loginAttempts.entries()) {
		if (now > record.resetAt) {
			loginAttempts.delete(ip);
		}
	}
}, 60000);
