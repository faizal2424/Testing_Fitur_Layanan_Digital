import type { Context, Next } from 'hono';
import { getSessionUser } from '../lib/auth.js';

// ============================================================
// Middleware: requireAuth
// Digunakan pada semua route /api/admin/*
// Attach user ke c.var.user jika valid, atau return 401
// ============================================================
export async function requireAuth(c: Context, next: Next) {
  const user = await getSessionUser(c);

  if (!user) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized. Silakan login terlebih dahulu.',
        code: 'UNAUTHENTICATED'
      },
      401
    );
  }

  // Attach user ke context variable untuk diakses route handler
  c.set('user', user);
  await next();
}

// ============================================================
// Middleware: requireAdmin
// Digunakan pada route yang hanya boleh diakses admin/superadmin
// ============================================================
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get('user') as any;

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return c.json(
      {
        success: false,
        error: 'Forbidden. Hanya admin yang dapat mengakses endpoint ini.',
        code: 'FORBIDDEN'
      },
      403
    );
  }

  await next();
}

// ============================================================
// Middleware: requireSuperAdmin
// ============================================================
export async function requireSuperAdmin(c: Context, next: Next) {
  const user = c.get('user') as any;

  if (!user || user.role !== 'superadmin') {
    return c.json(
      {
        success: false,
        error: 'Forbidden. Hanya superadmin yang dapat mengakses endpoint ini.',
        code: 'FORBIDDEN'
      },
      403
    );
  }

  await next();
}
