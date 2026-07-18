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
	console.log('Checking database seeds...');

	const existingUsers = await db.select().from(schema.users);
	const seededUsers = [
		{ name: 'Alice (Author)', email: 'alice@example.com', role: 'author' },
		{ name: 'Bob (Reviewer)', email: 'bob@example.com', role: 'reviewer' },
		{ name: 'Admin (Administrator)', email: 'admin@example.com', role: 'admin' },
		{ name: 'Viewer (Viewer)', email: 'viewer@example.com', role: 'viewer' }
	];

	for (const u of seededUsers) {
		const exists = existingUsers.some((x) => x.email === u.email);
		if (!exists) {
			const [inserted] = await db.insert(schema.users).values(u).returning();
			console.log(`Seeded user: ${inserted.name} (${inserted.role}) - ID: ${inserted.id}`);
		} else {
			console.log(`User ${u.email} already exists, skipping.`);
		}
	}

	console.log('Database seeding check finished.');
	await client.end();
}

main().catch((err) => {
	console.error('Seeding failed:', err);
	process.exit(1);
});
