import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { documents, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	if (user.role !== 'admin') {
		throw error(403, 'Unauthorized. Only administrators can access the archive.');
	}

	const archivedDocs = await db
		.select({
			id: documents.id,
			title: documents.title,
			status: documents.status,
			version: documents.version,
			createdAt: documents.createdAt,
			updatedAt: documents.updatedAt,
			authorName: users.name
		})
		.from(documents)
		.innerJoin(users, eq(documents.authorId, users.id))
		.where(eq(documents.status, 'archived'))
		.orderBy(documents.updatedAt);

	return {
		documents: archivedDocs
	};
};
