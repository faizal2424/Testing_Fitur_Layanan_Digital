import { db } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Cookies } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Prisma } from '@prisma/client';

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

	// secure: aktif otomatis di production (HTTPS), nonaktif di development.
	// Bisa di-override via env COOKIE_SECURE=true/false.
	const secure =
		process.env.COOKIE_SECURE === 'true' ||
		(!dev && process.env.COOKIE_SECURE !== 'false');

	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
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

		// Get user with role and agency
		const user = await db.users.findUnique({
			where: { id: session.user_id },
			include: {
				user_roles: {
					include: {
						roles: true
					}
				},
				agencies: true
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
			role: roleName,
			agency_id: user.agency_id ? user.agency_id.toString() : null,
			agency_name: user.agencies ? user.agencies.name : null
		};
	} catch {
		return null;
	}
}
import type { RequestEvent } from '@sveltejs/kit';

export function requireAdmin(event: RequestEvent) {
  const user = event.locals.user;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    throw redirect(302, '/mlebet');
  }
}

export function requireSuperAdmin(event: RequestEvent) {
  const user = event.locals.user;
  if (!user || user.role !== 'superadmin') {
    throw redirect(302, '/mlebet');
  }
}

/**
 * Check if user owns the resource (for admin/OPD users).
 * Superadmin bypasses this check.
 * @param event - SvelteKit event (has locals.user)
 * @param resourceAgencyId - The agency_id of the resource (BigInt or string)
 * @returns true if user owns the resource or is superadmin
 */
export function checkOwnership(event: RequestEvent, resourceAgencyId: bigint | string | null | undefined): boolean {
  const user = event.locals.user;
  if (!user) return false;
  
  // Superadmin can access everything
  if (user.role === 'superadmin') return true;
  
  // Admin must have agency_id and it must match
  if (user.role === 'admin' && user.agency_id) {
    const userAgencyId = BigInt(user.agency_id);
    const resourceId = resourceAgencyId ? BigInt(resourceAgencyId) : null;
    return resourceId !== null && userAgencyId === resourceId;
  }
  
  return false;
}

/**
 * Guard that throws 403 if user doesn't own the resource.
 * Use in actions where ownership is required.
 */
export function requireOwnership(event: RequestEvent, resourceAgencyId: bigint | string | null | undefined) {
  if (!checkOwnership(event, resourceAgencyId)) {
    throw redirect(302, '/mlebet'); // or throw error(403, 'Forbidden')
  }
}

// ============================================================
// Submission Access Control (PIC / Admin / Superadmin)
// ============================================================

/**
 * Build the Prisma `where` filter that scopes service_submissions
 * to what the current user is allowed to see.
 *
 * - superadmin: no filter (sees everything) → returns {}
 * - admin (OPD): only submissions from their own agency's services
 * - pic: only submissions they are assigned to OR are a team member of
 *
 * @param user - The authenticated user (from locals.user)
 * @returns A Prisma where-clause fragment (empty object = no restriction)
 */
export function buildSubmissionViewFilter(user: { id: bigint | string; role: string; agency_id?: string | null } | null | undefined): Prisma.service_submissionsWhereInput {
  if (!user) return {};

  if (user.role === 'pic') {
    const userId = BigInt(user.id);
    return {
      OR: [
        { assigned_to: userId },
        { submission_team_members: { some: { user_id: userId } } }
      ]
    };
  }

  if (user.role === 'admin' && user.agency_id) {
    return {
      services: { agency_id: BigInt(user.agency_id) }
    };
  }

  // superadmin (or unknown role) — no restriction
  return {};
}

/**
 * Check whether a user can access a given submission.
 * - superadmin → always allowed
 * - admin (OPD) → allowed if the submission belongs to their agency
 * - pic → allowed if they are the primary PIC or a team member
 *
 * @param user - The authenticated user (from locals.user)
 * @param submission - The submission with `assigned_to`, `agency_id`, `services.agency_id`, and `submission_team_members`
 * @returns true if the user may access the submission
 */
export function canAccessSubmission(
  user: { id: bigint | string; role: string; agency_id?: string | null } | null | undefined,
  submission: {
    assigned_to?: bigint | string | null;
    agency_id?: bigint | string | null;
    services?: { agency_id?: bigint | string | null } | null;
    submission_team_members?: Array<{ user_id: bigint | string }> | null;
  }
): boolean {
  if (!user) return false;

  // superadmin bypasses all checks
  if (user.role === 'superadmin') return true;

  const userId = BigInt(user.id);

  // PIC: must be primary PIC or team member
  if (user.role === 'pic') {
    const isPrimary = submission.assigned_to ? BigInt(submission.assigned_to) === userId : false;
    const isTeamMember = submission.submission_team_members?.some(
      (tm) => BigInt(tm.user_id) === userId
    ) ?? false;
    return isPrimary || isTeamMember;
  }

  // Admin (OPD): submission must belong to their agency
  if (user.role === 'admin') {
    if (!user.agency_id) return false;
    const targetAgencyId = submission.agency_id || submission.services?.agency_id || null;
    if (!targetAgencyId) return false;
    return BigInt(user.agency_id) === BigInt(targetAgencyId);
  }

  return false;
}

/**
 * Guard that throws 403 if the user cannot access the submission.
 * Use in load functions and actions where submission access is required.
 */
export function requireSubmissionAccess(
  event: RequestEvent,
  submission: {
    assigned_to?: bigint | string | null;
    agency_id?: bigint | string | null;
    services?: { agency_id?: bigint | string | null } | null;
    submission_team_members?: Array<{ user_id: bigint | string }> | null;
  }
) {
  if (!canAccessSubmission(event.locals.user, submission)) {
    throw error(403, 'Anda tidak memiliki akses ke pengajuan ini.');
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
