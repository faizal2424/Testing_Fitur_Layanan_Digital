# Backend API Server - Digital Services

## Environment Variables

Copy file ini menjadi `.env` dan sesuaikan nilainya.

```bash
cp .env.example .env
```

## Variabel yang Dibutuhkan

```env
# Database (sama dengan frontend)
DATABASE_URL="mysql://user:password@localhost:3306/digital_services"

# Server
PORT=3001

# CORS — masukkan origin frontend (pisahkan koma jika lebih dari satu)
CORS_ORIGINS="http://localhost:5173,http://localhost:5174"

# Session cookie config
SESSION_COOKIE_NAME="session_id"
SESSION_MAX_AGE_SECONDS=2592000

# Environment
NODE_ENV="development"

# Email (Nodemailer)
MAIL_HOST="smtp.example.com"
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER="user@example.com"
MAIL_PASS="password"
MAIL_FROM="\"Layanan Digital\" <no-reply@example.com>"
```

## Menjalankan Server

```bash
# Install dependencies
npm install

# Jalankan di mode dev (hot reload)
npm run dev

# Server berjalan di: http://localhost:3001
```

## Endpoints yang Tersedia (Fase 1)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | /api/auth/login | Login, set session cookie |
| POST | /api/auth/logout | Hapus session |
| GET | /api/auth/me | Cek session aktif |
| GET | /api/tracking/:code | Cek status pengajuan (publik) |
| GET | /health | Health check |
