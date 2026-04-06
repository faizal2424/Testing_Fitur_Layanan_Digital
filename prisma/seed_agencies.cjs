const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const opds = [
	"Sekretariat Daerah","Sekretariat DPRD","Badan Perencanaan Pembangunan","Badan Kepegawaian dan Pengembangan Sumber Daya Manusia","Badan Penanggulangan Bencana Daerah","RSUD dr. Gunawan Mangunkusumo","RSUD dr. Gondo Suwarno","Badan Keuangan Daerah","Badan Kesatuan Bangsa dan Politik","Inspektorat Daerah","Satpol PP & Damkar","Dinas Kearsipan dan Perpustakaan","Dinas Lingkungan Hidup","Dinas Sosial","Dinas Tenaga Kerja","Dinas Pendidikan","Dinas Kesehatan","Dinas Pemberdayaan Perempuan","Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu","Dinas Pemberdayaan Masyarakat dan Desa","Dinas Pekerjaan Umum","Dinas Kependudukan dan Pencatatan Sipil","Dinas Pertanian","Dinas Perhubungan","Dinas Komunikasi dan Informatika","Dinas Pariwisata","Dinas Koperasi","Kecamatan Ambarawa","Kecamatan Bancak","Kecamatan Bandungan","Kecamatan Banyubiru","Kecamatan Bawen","Kecamatan Bergas","Kecamatan Bringin","Kecamatan Getasan","Kecamatan Jambu","Kecamatan Kaliwungu","Kecamatan Pabelan","Kecamatan Pringapus","Kecamatan Sumowono","Kecamatan Suruh","Kecamatan Susukan","Kecamatan Tengaran","Kecamatan Tuntang","Kecamatan Ungaran Barat","Kecamatan Ungaran Timur","Lainnya"
];

async function main() {
	console.log('Seeding agencies...');
	let diskominfoId = null;

	for (const opd of opds) {
		const existing = await prisma.agencies.findFirst({ where: { name: opd } });
		let agency;
		if (!existing) {
			agency = await prisma.agencies.create({ data: { name: opd } });
		} else {
			agency = existing;
		}
		
		if (opd === "Dinas Komunikasi dan Informatika") {
			diskominfoId = agency.id;
		}
	}

	console.log('Agencies seeded.');

	if (diskominfoId) {
		console.log(`Setting diskominfoId (${diskominfoId}) as default agency for existing services where agency_id is null`);
		
		const updatedServices = await prisma.services.updateMany({
			where: { agency_id: null },
			data: { agency_id: diskominfoId }
		});
		console.log(`Updated ${updatedServices.count} services.`);
		
		const updatedUsers = await prisma.users.updateMany({
			where: { agency_id: null, user_roles: { some: { roles: { name: 'admin' } } } },
			data: { agency_id: diskominfoId }
		});
		console.log(`Updated ${updatedUsers.count} users (admins).`);
	}
}

main()
	.catch(e => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
