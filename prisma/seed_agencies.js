import mysql from 'mysql2/promise';

const opds = [
	"Sekretariat Daerah","Sekretariat DPRD","Badan Perencanaan Pembangunan","Badan Kepegawaian dan Pengembangan Sumber Daya Manusia","Badan Penanggulangan Bencana Daerah","RSUD dr. Gunawan Mangunkusumo","RSUD dr. Gondo Suwarno","Badan Keuangan Daerah","Badan Kesatuan Bangsa dan Politik","Inspektorat Daerah","Satpol PP & Damkar","Dinas Kearsipan dan Perpustakaan","Dinas Lingkungan Hidup","Dinas Sosial","Dinas Tenaga Kerja","Dinas Pendidikan","Dinas Kesehatan","Dinas Pemberdayaan Perempuan","Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu","Dinas Pemberdayaan Masyarakat dan Desa","Dinas Pekerjaan Umum","Dinas Kependudukan dan Pencatatan Sipil","Dinas Pertanian","Dinas Perhubungan","Dinas Komunikasi dan Informatika","Dinas Pariwisata","Dinas Koperasi","Kecamatan Ambarawa","Kecamatan Bancak","Kecamatan Bandungan","Kecamatan Banyubiru","Kecamatan Bawen","Kecamatan Bergas","Kecamatan Bringin","Kecamatan Getasan","Kecamatan Jambu","Kecamatan Kaliwungu","Kecamatan Pabelan","Kecamatan Pringapus","Kecamatan Sumowono","Kecamatan Suruh","Kecamatan Susukan","Kecamatan Tengaran","Kecamatan Tuntang","Kecamatan Ungaran Barat","Kecamatan Ungaran Timur","Lainnya"
];

async function main() {
	const connection = await mysql.createConnection('mysql://root:@localhost:3306/digital_services');
	console.log('Connected. Seeding agencies...');
	let diskominfoId = null;

	for (const opd of opds) {
		const [rows] = await connection.execute('SELECT id FROM agencies WHERE name = ?', [opd]);
		let agencyId;
		if (rows.length === 0) {
			const [result] = await connection.execute('INSERT INTO agencies (name) VALUES (?)', [opd]);
			agencyId = result.insertId;
		} else {
			agencyId = rows[0].id;
		}
		
		if (opd === "Dinas Komunikasi dan Informatika") {
			diskominfoId = agencyId;
		}
	}

	console.log('Agencies seeded.');

	if (diskominfoId) {
		console.log(`Setting diskominfoId (${diskominfoId}) as default agency for existing services where agency_id is null`);
		
		const [resServ] = await connection.execute('UPDATE services SET agency_id = ? WHERE agency_id IS NULL', [diskominfoId]);
		console.log(`Updated ${resServ.affectedRows} services.`);
		
		// Map admins to Diskominfo
		const [resUsers] = await connection.execute(`
			UPDATE users u
			JOIN user_roles ur ON u.id = ur.user_id
			JOIN roles r ON ur.role_id = r.id
			SET u.agency_id = ? 
			WHERE u.agency_id IS NULL AND r.name = 'admin'
		`, [diskominfoId]);
		console.log(`Updated ${resUsers.affectedRows} admin users.`);
	}

	await connection.end();
}

main().catch(console.error);
