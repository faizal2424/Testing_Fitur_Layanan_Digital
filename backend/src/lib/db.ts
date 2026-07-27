import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { existsSync } from 'fs';

// Load DATABASE_URL dari environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Parse mysql://user:password@host:port/database
const parseDbUrl = (url: string) => {
  const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error(`Invalid DATABASE_URL format: ${url}`);

  return {
    user: match[1],
    password: match[2] || undefined, // password bisa kosong
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
};

const dbConfig = parseDbUrl(DATABASE_URL);

// Deteksi socket path XAMPP (macOS)
// XAMPP menggunakan Unix socket, bukan TCP, di macOS
const XAMPP_SOCKET = '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';
const useSocket = dbConfig.host === 'localhost' && existsSync(XAMPP_SOCKET);

const adapterConfig: any = {
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database
};

if (useSocket) {
  // Pakai Unix socket untuk XAMPP — jauh lebih cepat & stabil
  adapterConfig.socketPath = XAMPP_SOCKET;
  console.log(`[DB] Menggunakan XAMPP socket: ${XAMPP_SOCKET}`);
} else {
  adapterConfig.host = dbConfig.host;
  adapterConfig.port = dbConfig.port;
}

const adapter = new PrismaMariaDb(adapterConfig);

export const db = new PrismaClient({ adapter });

// Supaya BigInt dari Laravel tidak bikin error JSON.stringify
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}
