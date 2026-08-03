import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { env } from '$env/dynamic/private';

// ─────────────────────────────────────────────────────────────
//  Storage abstraction
//  Backends:
//    - 'local' (default): writes to LOCAL_STORAGE_DIR outside
//      `static/` so files are NOT served publicly by SvelteKit
//      and are NOT tracked by git.
//    - 's3': S3-compatible object storage (AWS S3, Cloudflare R2,
//      MinIO, etc.) configured via S3_* env vars.
// ─────────────────────────────────────────────────────────────

const DRIVER = (env.STORAGE_DRIVER || 'local').toLowerCase();

// ── Local volume backend ─────────────────────────────────────
const LOCAL_DIR = env.LOCAL_STORAGE_DIR
	? join(process.cwd(), env.LOCAL_STORAGE_DIR)
	: join(process.cwd(), 'storage');

function localPath(key: string): string {
	// Prevent path traversal
	const safe = key.replace(/\.\./g, '_').replace(/^\/+/, '');
	return join(LOCAL_DIR, safe);
}

// ── S3 backend (lazy import so no crash when S3 not configured) ──
import type {
	PutObjectCommandInput,
	GetObjectCommandInput,
	DeleteObjectCommandInput
} from '@aws-sdk/client-s3';

type S3PutArgs = PutObjectCommandInput;
type S3GetArgs = GetObjectCommandInput;
type S3GetResult = { Body: unknown; ContentType?: string };
type S3DeleteArgs = DeleteObjectCommandInput;

type S3ClientInstance = {
	send(command: unknown): Promise<S3GetResult>;
};

interface S3ClientLike {
	putObject(args: S3PutArgs): Promise<unknown>;
	getObject(args: S3GetArgs): Promise<S3GetResult>;
	deleteObject(args: S3DeleteArgs): Promise<unknown>;
}

let s3Client: S3ClientLike | null = null;

async function getS3(): Promise<S3ClientLike> {
	if (s3Client) return s3Client;

	const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import(
		'@aws-sdk/client-s3'
	);

	const region = env.S3_REGION || 'auto';
	const endpoint = env.S3_ENDPOINT || undefined;
	const bucket = env.S3_BUCKET;
	if (!bucket) {
		throw new Error('S3_BUCKET env tidak diset, tetapi STORAGE_DRIVER=s3.');
	}

	const client = new S3Client({
		region,
		endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId: env.S3_ACCESS_KEY_ID || '',
			secretAccessKey: env.S3_SECRET_ACCESS_KEY || ''
		}
	}) as unknown as S3ClientInstance;

	s3Client = {
		async putObject(args: S3PutArgs) {
			return client.send(new PutObjectCommand(args));
		},
		async getObject(args: S3GetArgs) {
			return client.send(new GetObjectCommand(args));
		},
		async deleteObject(args: S3DeleteArgs) {
			return client.send(new DeleteObjectCommand(args));
		}
	};

	return s3Client;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<Uint8Array> {
	return (
		!!value &&
		typeof (value as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function'
	);
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
	if (Buffer.isBuffer(stream)) return stream;
	if (!isAsyncIterable(stream)) return Buffer.alloc(0);

	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

// ── Key helpers ──────────────────────────────────────────────
export function submissionKey(trackingCode: string, fileName: string): string {
	return `submissions/${trackingCode}/${fileName}`;
}

export function evidenceKey(trackingCode: string, fileName: string): string {
	return `evidence/${trackingCode}/${fileName}`;
}

/**
 * Convert a storage key to a URL that goes through the protected
 * `/api/files/...` endpoint instead of public `static/uploads`.
 */
export function toPublicUrl(key: string): string {
	return `/api/files/${key}`;
}

export type StoredFile = {
	body: Buffer;
	contentType: string | null;
	contentLength: number | null;
};

export const LEGACY_UPLOADS_PREFIX = '/static/uploads/';

/**
 * Resolve a stored `file_path` (new key or legacy `/static/uploads/...`)
 * into a protected `/api/files/...` URL.
 */
export function resolveFileUrl(filePath: string | null | undefined): string | null {
	if (!filePath) return null;

	if (filePath.startsWith('/api/files/')) return filePath;

	if (filePath.startsWith(LEGACY_UPLOADS_PREFIX)) {
		const legacyPath = filePath.slice(LEGACY_UPLOADS_PREFIX.length);
		switch (true) {
			case legacyPath.startsWith('evidence/'):
				return toPublicUrl(evidenceKeyFromLegacy(legacyPath));
			case legacyPath.startsWith('SVC-'):
				return toPublicUrl(`submissions/${legacyPath}`);
			default:
				return null;
		}
	}

	return toPublicUrl(filePath);
}

function evidenceKeyFromLegacy(legacyPath: string): string {
	// evidence/BSX1TAGYRY/file.png  ->  evidence/BSX1TAGYRY/file.png
	return legacyPath;
}

// ── Write ────────────────────────────────────────────────────
export async function putFile(
	key: string,
	data: Buffer | Uint8Array,
	contentType?: string
): Promise<void> {
	const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

	if (DRIVER === 's3') {
		const s3 = await getS3();
		await s3.putObject({
			Bucket: env.S3_BUCKET,
			Key: key,
			Body: buffer,
			ContentType: contentType || 'application/octet-stream'
		});
		return;
	}

	// local
	const fullPath = localPath(key);
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, buffer);
}

// ── Read ─────────────────────────────────────────────────────
export async function getFile(key: string): Promise<StoredFile | null> {
	if (DRIVER === 's3') {
		try {
			const s3 = await getS3();
			const result = await s3.getObject({
				Bucket: env.S3_BUCKET,
				Key: key
			});
			const body = await streamToBuffer(result.Body);
			return {
				body,
				contentType: typeof result.ContentType === 'string' ? result.ContentType : null,
				contentLength: body.length
			};
		} catch (err: unknown) {
			const meta = (err as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata;
			const name = (err as { name?: string } | null)?.name;
			if (meta?.httpStatusCode === 404 || name === 'NoSuchKey') {
				return null;
			}
			throw err;
		}
	}

	// local
	const fullPath = localPath(key);
	if (!existsSync(fullPath)) return null;

	try {
		const body = await readFile(fullPath);
		return { body, contentType: null, contentLength: body.length };
	} catch {
		return null;
	}
}

// ── Delete ───────────────────────────────────────────────────
export async function deleteFile(key: string): Promise<void> {
	if (DRIVER === 's3') {
		try {
			const s3 = await getS3();
			await s3.deleteObject({
				Bucket: env.S3_BUCKET,
				Key: key
			});
		} catch {
			// ignore
		}
		return;
	}

	const fullPath = localPath(key);
	try {
		await unlink(fullPath);
	} catch {
		// ignore
	}
}