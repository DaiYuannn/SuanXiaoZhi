import prismaPkg from '@prisma/client';
const { PrismaClient } = prismaPkg as unknown as { PrismaClient: new () => any };
import fs from 'fs';
import path from 'path';

export const prisma = new PrismaClient();

function parseSqlitePath(url?: string): string | null {
	if (!url) return null;
	// Support forms like: file:./data/prod.db?connection_limit=1
	if (url.startsWith('file:')) {
		const withoutPrefix = url.slice('file:'.length);
		const filePart = withoutPrefix.split('?')[0];
		// Resolve relative to server root (dist/runtime cwd may vary)
		const abs = path.isAbsolute(filePart) ? filePart : path.resolve(process.cwd(), filePart);
		return abs;
	}
	if (url.startsWith('sqlite:')) {
		const withoutPrefix = url.slice('sqlite:'.length);
		const filePart = withoutPrefix.split('?')[0];
		const abs = path.isAbsolute(filePart) ? filePart : path.resolve(process.cwd(), filePart);
		return abs;
	}
	return null;
}

export async function initDB() {
	const dbUrl = process.env.DATABASE_URL || '';
	const sqlitePath = parseSqlitePath(dbUrl);
	if (sqlitePath) {
		// Ensure directory exists
		const dir = path.dirname(sqlitePath);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		// Enable WAL mode for better concurrency and durability
		try {
			await prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;');
			await prisma.$executeRawUnsafe('PRAGMA synchronous=NORMAL;');
		} catch {
			// ignore if not supported
		}
	}
}
