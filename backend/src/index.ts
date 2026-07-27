import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes
import { auth } from './routes/auth.js';
import { tracking } from './routes/tracking.js';

// ── App Setup ───────────────────────────────────────────────
const app = new Hono();

// ── CORS Configuration ──────────────────────────────────────
// Pisahkan origins dari env variable (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Set-Cookie'],
    credentials: true, // WAJIB untuk cookie cross-origin
    maxAge: 600
  })
);

// ── Request Logger ───────────────────────────────────────────
app.use('*', logger());

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Digital Services API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ── API Routes ────────────────────────────────────────────────
app.route('/api/auth', auth);
app.route('/api/tracking', tracking);

// ── 404 Fallback ──────────────────────────────────────────────
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: `Route ${c.req.method} ${c.req.path} tidak ditemukan.`
    },
    404
  );
});

// ── Global Error Handler ──────────────────────────────────────
app.onError((err, c) => {
  console.error('[Server Error]', err);
  return c.json(
    {
      success: false,
      error: 'Terjadi kesalahan internal pada server.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    },
    500
  );
});

// ── Start Server ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001');

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`\n🚀 Backend API berjalan di http://localhost:${info.port}`);
  console.log(`   CORS origins: ${allowedOrigins.join(', ')}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📋 Endpoints tersedia:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/logout`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/tracking/:code`);
  console.log('');
});

export default app;
