import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { documents, users } from '$lib/server/db/schema';
import { eq, or, and, ne, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	// Fetch active (non-archived) documents according to user visibility constraints
	let queryFilter;

	if (user.role === 'admin') {
		queryFilter = ne(documents.status, 'archived');
	} else if (user.role === 'viewer') {
		queryFilter = eq(documents.status, 'published');
	} else if (user.role === 'author') {
		queryFilter = or(
			eq(documents.authorId, user.id),
			eq(documents.status, 'published')
		);
	} else if (user.role === 'reviewer') {
		queryFilter = inArray(documents.status, ['submitted', 'approved', 'rejected', 'published']);
	} else {
		queryFilter = eq(documents.id, 'none'); // Fail-safe empty filter
	}

	const docs = await db
		.select({
			id: documents.id,
			title: documents.title,
			status: documents.status,
			version: documents.version,
			createdAt: documents.createdAt,
			updatedAt: documents.updatedAt,
			authorId: documents.authorId,
			authorName: users.name
		})
		.from(documents)
		.innerJoin(users, eq(documents.authorId, users.id))
		.where(queryFilter)
		.orderBy(documents.updatedAt);

	return {
		documents: docs
	};
};
