require('dotenv').config();
const mariadb = require('mariadb/promise');

const m = process.env.DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
if (!m) {
	console.error('Invalid DATABASE_URL');
	process.exit(1);
}

const pool = mariadb.createPool({
	user: m[1],
	password: m[2],
	host: m[3],
	port: parseInt(m[4], 10),
	database: m[5],
	supportBigNumbers: true,
	bigIntAsNumber: false
});

(async () => {
	const subs = await pool.query(
		'SELECT id FROM service_submissions ORDER BY id DESC LIMIT 1'
	);
	if (subs.length === 0) {
		console.log('NO_SUBMISSIONS');
		await pool.end();
		return;
	}
	const s = subs[0];
	console.log('Using real submission:', JSON.stringify(s));

	const now = Math.floor(Date.now() / 1000);
	const payload = JSON.stringify({
		name: 'send-event-email',
		data: {
			meta: {
				submissionId: String(s.id),
				eventType: 'submission_received',
				recipientRole: 'admin',
				recipientEmail: 'e2e-admin@example.com'
			},
			mailOptions: {
				to: 'e2e-admin@example.com',
				subject: '[E2E] Test Real Submission',
				html: '<p>test</p>',
				text: 'test'
			}
		}
	});
	const r = await pool.query(
		'INSERT INTO jobs (queue, payload, attempts, available_at, created_at) VALUES (?, ?, 0, ?, ?)',
		['email', payload, now, now]
	);
	console.log('Job inserted id:', r.insertId);
	await pool.end();
})().catch((e) => {
	console.error(e.message);
	process.exit(1);
});