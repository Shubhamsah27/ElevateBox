import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
	throw new Error('DATABASE_URL is not defined in the environment');
}

const client = postgres(dbUrl, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
	console.log('Seeding database...');

	// Clean up existing data in correct order
	await db.delete(schema.sessions);
	await db.delete(schema.auditEvents);
	await db.delete(schema.documents);
	await db.delete(schema.users);

	// Insert users
	const seededUsers: Array<typeof schema.users.$inferInsert> = [
		{ name: 'Alice (Author)', email: 'alice@example.com', role: 'author' },
		{ name: 'Bob (Reviewer)', email: 'bob@example.com', role: 'reviewer' },
		{ name: 'Admin (Administrator)', email: 'admin@example.com', role: 'admin' },
		{ name: 'Viewer (Viewer)', email: 'viewer@example.com', role: 'viewer' }
	];

	for (const u of seededUsers) {
		const [inserted] = await db.insert(schema.users).values(u).returning();
		console.log(`Seeded user: ${inserted.name} (${inserted.role}) - ID: ${inserted.id}`);
	}

	console.log('Database seeding finished.');
	await client.end();
}

main().catch((err) => {
	console.error('Seeding failed:', err);
	process.exit(1);
});
