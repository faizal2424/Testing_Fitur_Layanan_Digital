import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { DATABASE_URL } from '$env/static/private';

// Parse the DATABASE_URL to extract connection details
// Format: mysql://user:password@host:port/database
const parseDbUrl = (url: string) => {
	const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
	if (!match) throw new Error('Invalid DATABASE_URL format');
	
	return {
		user: match[1],
		password: match[2],
		host: match[3],
		port: parseInt(match[4]),
		database: match[5]
	};
};

const dbConfig = parseDbUrl(DATABASE_URL);

// Create the PrismaClient with the MariaDB adapter (required for Prisma v7)
const adapter = new PrismaMariaDb({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database,
	port: dbConfig.port
});

export const db = new PrismaClient({ adapter });

// Supaya BigInt dari Laravel tidak bikin error
if (!(BigInt.prototype as any).toJSON) {
	(BigInt.prototype as any).toJSON = function () {
		return this.toString();
	};
}