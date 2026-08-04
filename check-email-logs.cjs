const fs = require('fs');
const mariadb = require('mariadb/promise');

// Load DATABASE_URL from .env
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
if (!match) { console.error('DATABASE_URL not found in .env'); process.exit(1); }
const DATABASE_URL = match[1];

const m = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
if (!m) { console.error('Invalid DATABASE_URL format'); process.exit(1); }

(async () => {
  const pool = mariadb.createPool({ user:m[1], password:m[2], host:m[3], port:parseInt(m[4]), database:m[5], supportBigNumbers:true, bigIntAsNumber:false });
  const tables = await pool.query("SHOW TABLES LIKE 'email_logs'");
  if (tables.length === 0) { console.log('email_logs: NOT FOUND'); process.exit(2); }
  console.log('email_logs: OK');
  const cols = await pool.query('SHOW COLUMNS FROM email_logs');
  const indexes = await pool.query('SHOW INDEX FROM email_logs');
  const uniq = indexes.filter(i => i.Non_unique === 0).map(i => i.Key_name);
  console.log('Columns:', cols.map(c => c.Field).join(', '));
  console.log('Unique keys:', [...new Set(uniq)].join(', '));
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });