import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { documents, auditEvents, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
	canViewDocument,
	editDocument,
	submitForReview,
	approveDocument,
	rejectDocument,
	reopenDocument,
	publishDocument,
	archiveDocument,
	WorkflowError
} from '$lib/server/workflow';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	const docId = params.id;

	// Fetch document
	const [doc] = await db
		.select({
			id: documents.id,
			title: documents.title,
			body: documents.body,
			status: documents.status,
			authorId: documents.authorId,
			version: documents.version,
			createdAt: documents.createdAt,
			updatedAt: documents.updatedAt,
			authorName: users.name
		})
		.from(documents)
		.innerJoin(users, eq(documents.authorId, users.id))
		.where(eq(documents.id, docId))
		.limit(1);

	if (!doc) {
		throw error(404, 'Document not found');
	}

	// Verify authorization
	if (!canViewDocument(user, doc)) {
		throw error(403, 'Access denied. You do not have permissions to view this document.');
	}

	// Fetch audit history
	const history = await db
		.select({
			id: auditEvents.id,
			action: auditEvents.action,
			timestamp: auditEvents.timestamp,
			comment: auditEvents.comment,
			previousStatus: auditEvents.previousStatus,
			newStatus: auditEvents.newStatus,
			version: auditEvents.version,
			actorName: users.name
		})
		.from(auditEvents)
		.innerJoin(users, eq(auditEvents.actorId, users.id))
		.where(eq(auditEvents.documentId, docId))
		.orderBy(desc(auditEvents.timestamp));

	return {
		document: doc,
		auditHistory: history
	};
};

export const actions: Actions = {
	edit: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		const docId = params.id;
		const data = await request.formData();
		const title = data.get('title') as string;
		const body = data.get('body') as string;
		const versionStr = data.get('version') as string;
		const expectedVersion = parseInt(versionStr, 10);

		try {
			await editDocument(user, docId, expectedVersion, title, body);
			return { success: true };
		} catch (err) {
			if (err instanceof WorkflowError) {
				return fail(err.status, { message: err.message });
			}
			throw err;
		}
	},

	submit: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		const docId = params.id;
		const data = await request.formData();
		const versionStr = data.get('version') as string;
		const expectedVersion = parseInt(versionStr, 10);

		try {
			await submitForReview(user, docId, expectedVersion);
			return { success: true };
		} catch (err) {
			if (err instanceof WorkflowError) {
				return fail(err.status, { message: err.message });
			}
			throw err;
		}
	},

	reopen: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		const docId = params.id;
		const data = await request.formData();
		const versionStr = data.get('version') as string;
		const expectedVersion = parseInt(versionStr, 10);

		try {
			await reopenDocument(user, docId, expectedVersion);
			return { success: true };
		} catch (err) {
			if (err instanceof WorkflowError) {
				return fail(err.status, { message: err.message });
			}
			throw err;
		}
	},

	approve: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		const docId = params.id;
		const data = await request.formData();
		const versionStr = data.get('version') as string;
		const expectedVersion = parseInt(versionStr, 10);

		try {
			await approveDocument(user, docId, expectedVersion);
			return { success: true };
		} catch (err) {
			if (err instanceof WorkflowError) {
				return fail(err.status, { message: err.message });
			}
			throw err;
		}
	},

	reject: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		const docId = params.id;
		const data = await request.formData();
		const versionStr = data.get('version') as string;
		const expectedVersion = parseInt(versionStr, 10);
		const comment = data.get('comment') as string;

		try {
			await rejectDocument(user, docId, expectedVersion, comment);
			return { success: true };
		} catch (err) {
			if (err instanceof WorkflowError) {
				return fail(err.status, { message: err.message });
			}
			throw err;
		}
	},

	publish: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		const docId = params.id;
		const data = await request.formData();
		const versionStr = data.get('version') as string;
		const expectedVersion = parseInt(versionStr, 10);

		try {
			await publishDocument(user, docId, expectedVersion);
			return { success: true };
		} catch (err) {
			if (err instanceof WorkflowError) {
				return fail(err.status, { message: err.message });
			}
			throw err;
		}
	},

	archive: async ({ params, request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		const docId = params.id;
		const data = await request.formData();
		const versionStr = data.get('version') as string;
		const expectedVersion = parseInt(versionStr, 10);

		try {
			await archiveDocument(user, docId, expectedVersion);
			return { success: true };
		} catch (err) {
			if (err instanceof WorkflowError) {
				return fail(err.status, { message: err.message });
			}
			throw err;
		}
	}
};
