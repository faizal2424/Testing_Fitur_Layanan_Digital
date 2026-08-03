#!/usr/bin/env node
/* eslint-disable */
/**
 * Migrasi file upload legacy dari `static/uploads/` ke volume penyimpanan
 * (`storage/` atau `LOCAL_STORAGE_DIR`).
 *
 * Struktur lama:
 *   static/uploads/evidence/{trackingCode}/{fileName}        -> evidence/{trackingCode}/{fileName}
 *   static/uploads/{trackingCode}/{fileName}                 -> submissions/{trackingCode}/{fileName}
 *
 * Penggunaan:
 *   node scripts/migrate-uploads.cjs
 *
 * Opsi env:
 *   LOCAL_STORAGE_DIR  tujuan volume (default: ./storage)
 *   DRY_RUN=1          hanya tampilkan rencana tanpa menyalin
 */
const { mkdir, readdir, copyFile, unlink, stat } = require('fs/promises');
const { join, dirname, relative } = require('path');
const { existsSync } = require('fs');

const ROOT = process.cwd();
const SRC_ROOT = join(ROOT, 'static', 'uploads');
const DEST_ROOT = process.env.LOCAL_STORAGE_DIR
	? join(ROOT, process.env.LOCAL_STORAGE_DIR)
	: join(ROOT, 'storage');
const DRY_RUN = process.env.DRY_RUN === '1';

async function collectFiles(dir) {
	const out = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await collectFiles(full)));
		} else if (entry.isFile()) {
			out.push(full);
		}
	}
	return out;
}

function toStorageKey(filePath) {
	const rel = relative(SRC_ROOT, filePath).split('/').join('/');
	// rel berbentuk: evidence/{code}/{file}  atau  {code}/{file}
	if (rel.startsWith('evidence/')) return rel;
	if (/^SVC-[^/]+\//.test(rel)) return `submissions/${rel}`;
	return null;
}

async function main() {
	console.log(`Sumber : ${SRC_ROOT}`);
	console.log(`Tujuan : ${DEST_ROOT}`);
	console.log(`Mode   : ${DRY_RUN ? 'DRY RUN (tidak menulis)' : 'MIGRASI'}`);
	console.log('');

	const files = await collectFiles(SRC_ROOT);
	const skipped = [];
	const migrated = [];

	for (const file of files) {
		const key = toStorageKey(file);
		if (!key) {
			skipped.push(file);
			continue;
		}

		const dest = join(DEST_ROOT, key);
		if (!DRY_RUN) {
			await mkdir(dirname(dest), { recursive: true });
			await copyFile(file, dest);
		}
		migrated.push({ from: relative(ROOT, file), to: `storage/${key}` });
	}

	for (const m of migrated) {
		console.log(`  -> ${m.from}`);
		console.log(`     => ${m.to}`);
		if (!DRY_RUN) {
			// Hanya hapus sumber jika hasil salinan benar-benar ada
			if (existsSync(join(ROOT, m.to))) {
				await unlink(join(ROOT, m.from));
			} else {
				console.error(`     !! GAGAL: hasil salin tidak ditemukan, sumber dipertahankan.`);
			}
		}
	}

	console.log('');
	console.log(`File dimigrasikan : ${migrated.length}`);
	console.log(`File dilewati     : ${skipped.length}`);
	if (skipped.length) {
		console.log('Dilewati (pola tidak dikenal):');
		for (const s of skipped) console.log(`  - ${relative(ROOT, s)}`);
	}

	// Bersihkan direktori kosong di static/uploads (kecuali dry-run)
	if (!DRY_RUN) {
		async function pruneEmpty(dir) {
			let entries = [];
			try {
				entries = await readdir(dir, { withFileTypes: true });
			} catch {
				return;
			}
			for (const e of entries) {
				if (e.isDirectory()) await pruneEmpty(join(dir, e.name));
			}
			entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
			if (entries.length === 0 && dir !== SRC_ROOT) {
				await stat(dir).then(async () => {
					await require('fs/promises').rmdir(dir);
					console.log(`  Direktori kosong dihapus: ${relative(ROOT, dir)}`);
				}).catch(() => {});
			}
		}
		await pruneEmpty(SRC_ROOT);
	}
}

main().catch((err) => {
	console.error('Migrasi gagal:', err);
	process.exit(1);
});