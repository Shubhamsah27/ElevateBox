import { db } from '$lib/server/db';
import { documents, auditEvents, users } from '$lib/server/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

// Custom Errors mapped to HTTP classes
export class WorkflowError extends Error {
	constructor(
		message: string,
		public status: number
	) {
		super(message);
		this.name = 'WorkflowError';
	}
}

export interface UserContext {
	id: string;
	name: string;
	email: string;
	role: 'author' | 'reviewer' | 'admin' | 'viewer';
}

export interface DocumentInfo {
	id: string;
	title: string;
	body: string;
	status: string;
	authorId: string;
	version: number;
}

// 1. Authorization checks
export function canViewDocument(user: UserContext, doc: DocumentInfo): boolean {
	if (doc.status === 'published') {
		return true; // Any authenticated user can view published
	}
	if (doc.status === 'archived') {
		return user.role === 'admin'; // Only admin can view archived
	}

	// Private workflow documents
	if (user.role === 'admin') {
		return true;
	}
	if (user.role === 'author') {
		return doc.authorId === user.id;
	}
	if (user.role === 'reviewer') {
		// Reviewer queue and review access. Reviewers can see submitted, approved, and rejected
		return doc.status === 'submitted' || doc.status === 'approved' || doc.status === 'rejected';
	}
	return false;
}

export function canEditDocument(user: UserContext, doc: DocumentInfo): boolean {
	// Draft and rejected documents are editable only by their owning author
	if (doc.status !== 'draft' && doc.status !== 'rejected') {
		return false;
	}
	return user.role === 'author' && doc.authorId === user.id;
}

// 2. Main Workflow Service Operations
export async function createDraft(user: UserContext, title: string, body: string) {
	if (user.role !== 'author') {
		throw new WorkflowError('Only authors can create document drafts.', 403);
	}
	if (!title.trim() || !body.trim()) {
		throw new WorkflowError('Title and body must be non-empty.', 422);
	}

	return await db.transaction(async (tx) => {
		const [doc] = await tx
			.insert(documents)
			.values({
				title: title.trim(),
				body: body.trim(),
				status: 'draft',
				authorId: user.id,
				version: 1
			})
			.returning();

		await tx.insert(auditEvents).values({
			documentId: doc.id,
			actorId: user.id,
			action: 'create',
			previousStatus: null,
			newStatus: 'draft',
			version: 1
		});

		return doc;
	});
}

export async function editDocument(
	user: UserContext,
	docId: string,
	expectedVersion: number,
	title: string,
	body: string
) {
	if (!title.trim() || !body.trim()) {
		throw new WorkflowError('Title and body must be non-empty.', 422);
	}

	return await db.transaction(async (tx) => {
		// Fetch current state
		const [currentDoc] = await tx
			.select()
			.from(documents)
			.where(eq(documents.id, docId))
			.limit(1);

		if (!currentDoc) {
			throw new WorkflowError('Document not found.', 404);
		}

		if (!canEditDocument(user, currentDoc)) {
			throw new WorkflowError('Unauthorized to edit this document.', 403);
		}

		// Optimistic concurrency and state checks
		const updatedRows = await tx
			.update(documents)
			.set({
				title: title.trim(),
				body: body.trim(),
				version: currentDoc.version + 1,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(documents.id, docId),
					eq(documents.version, expectedVersion),
					or(eq(documents.status, 'draft'), eq(documents.status, 'rejected'))
				)
			)
			.returning();

		if (updatedRows.length === 0) {
			throw new WorkflowError(
				'Conflict: Document was modified by another request or is in an invalid state. Please refresh and try again.',
				409
			);
		}

		const updatedDoc = updatedRows[0];

		await tx.insert(auditEvents).values({
			documentId: docId,
			actorId: user.id,
			action: 'edit',
			previousStatus: currentDoc.status,
			newStatus: updatedDoc.status,
			version: updatedDoc.version
		});

		return updatedDoc;
	});
}

export async function submitForReview(user: UserContext, docId: string, expectedVersion: number) {
	return await db.transaction(async (tx) => {
		const [currentDoc] = await tx
			.select()
			.from(documents)
			.where(eq(documents.id, docId))
			.limit(1);

		if (!currentDoc) {
			throw new WorkflowError('Document not found.', 404);
		}

		if (user.role !== 'author' || currentDoc.authorId !== user.id) {
			throw new WorkflowError('Only the owning author can submit a document.', 403);
		}

		if (currentDoc.status !== 'draft') {
			throw new WorkflowError('Only drafts can be submitted for review.', 422);
		}

		if (!currentDoc.title.trim() || !currentDoc.body.trim()) {
			throw new WorkflowError('Title and body must be non-empty.', 422);
		}

		const updatedRows = await tx
			.update(documents)
			.set({
				status: 'submitted',
				version: currentDoc.version + 1,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(documents.id, docId),
					eq(documents.version, expectedVersion),
					eq(documents.status, 'draft')
				)
			)
			.returning();

		if (updatedRows.length === 0) {
			throw new WorkflowError(
				'Conflict: Document was modified by another request. Please refresh and try again.',
				409
			);
		}

		const updatedDoc = updatedRows[0];

		await tx.insert(auditEvents).values({
			documentId: docId,
			actorId: user.id,
			action: 'submit',
			previousStatus: 'draft',
			newStatus: 'submitted',
			version: updatedDoc.version
		});

		return updatedDoc;
	});
}

export async function approveDocument(user: UserContext, docId: string, expectedVersion: number) {
	if (user.role !== 'reviewer') {
		throw new WorkflowError('Only reviewers can approve submissions.', 403);
	}

	return await db.transaction(async (tx) => {
		const [currentDoc] = await tx
			.select()
			.from(documents)
			.where(eq(documents.id, docId))
			.limit(1);

		if (!currentDoc) {
			throw new WorkflowError('Document not found.', 404);
		}

		if (currentDoc.status !== 'submitted') {
			throw new WorkflowError('Only submitted documents can be approved.', 422);
		}

		// Prevent self-approval
		if (currentDoc.authorId === user.id) {
			throw new WorkflowError('Reviewers cannot approve their own documents.', 403);
		}

		const updatedRows = await tx
			.update(documents)
			.set({
				status: 'approved',
				version: currentDoc.version + 1,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(documents.id, docId),
					eq(documents.version, expectedVersion),
					eq(documents.status, 'submitted')
				)
			)
			.returning();

		if (updatedRows.length === 0) {
			throw new WorkflowError(
				'Conflict: Document was modified by another request. Please refresh and try again.',
				409
			);
		}

		const updatedDoc = updatedRows[0];

		await tx.insert(auditEvents).values({
			documentId: docId,
			actorId: user.id,
			action: 'approve',
			previousStatus: 'submitted',
			newStatus: 'approved',
			version: updatedDoc.version
		});

		return updatedDoc;
	});
}

export async function rejectDocument(
	user: UserContext,
	docId: string,
	expectedVersion: number,
	comment: string
) {
	if (user.role !== 'reviewer') {
		throw new WorkflowError('Only reviewers can reject submissions.', 403);
	}
	if (!comment || !comment.trim()) {
		throw new WorkflowError('Rejection comment is required.', 422);
	}

	return await db.transaction(async (tx) => {
		const [currentDoc] = await tx
			.select()
			.from(documents)
			.where(eq(documents.id, docId))
			.limit(1);

		if (!currentDoc) {
			throw new WorkflowError('Document not found.', 404);
		}

		if (currentDoc.status !== 'submitted') {
			throw new WorkflowError('Only submitted documents can be rejected.', 422);
		}

		const updatedRows = await tx
			.update(documents)
			.set({
				status: 'rejected',
				version: currentDoc.version + 1,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(documents.id, docId),
					eq(documents.version, expectedVersion),
					eq(documents.status, 'submitted')
				)
			)
			.returning();

		if (updatedRows.length === 0) {
			throw new WorkflowError(
				'Conflict: Document was modified by another request. Please refresh and try again.',
				409
			);
		}

		const updatedDoc = updatedRows[0];

		await tx.insert(auditEvents).values({
			documentId: docId,
			actorId: user.id,
			action: 'reject',
			previousStatus: 'submitted',
			newStatus: 'rejected',
			comment: comment.trim(),
			version: updatedDoc.version
		});

		return updatedDoc;
	});
}

export async function reopenDocument(user: UserContext, docId: string, expectedVersion: number) {
	return await db.transaction(async (tx) => {
		const [currentDoc] = await tx
			.select()
			.from(documents)
			.where(eq(documents.id, docId))
			.limit(1);

		if (!currentDoc) {
			throw new WorkflowError('Document not found.', 404);
		}

		if (user.role !== 'author' || currentDoc.authorId !== user.id) {
			throw new WorkflowError('Only the owning author can reopen a rejected document.', 403);
		}

		if (currentDoc.status !== 'rejected') {
			throw new WorkflowError('Only rejected documents can be reopened.', 422);
		}

		const updatedRows = await tx
			.update(documents)
			.set({
				status: 'draft',
				version: currentDoc.version + 1,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(documents.id, docId),
					eq(documents.version, expectedVersion),
					eq(documents.status, 'rejected')
				)
			)
			.returning();

		if (updatedRows.length === 0) {
			throw new WorkflowError(
				'Conflict: Document was modified by another request. Please refresh and try again.',
				409
			);
		}

		const updatedDoc = updatedRows[0];

		await tx.insert(auditEvents).values({
			documentId: docId,
			actorId: user.id,
			action: 'reopen',
			previousStatus: 'rejected',
			newStatus: 'draft',
			version: updatedDoc.version
		});

		return updatedDoc;
	});
}

export async function publishDocument(user: UserContext, docId: string, expectedVersion: number) {
	if (user.role !== 'reviewer' && user.role !== 'admin') {
		throw new WorkflowError('Only reviewers or administrators can publish documents.', 403);
	}

	return await db.transaction(async (tx) => {
		const [currentDoc] = await tx
			.select()
			.from(documents)
			.where(eq(documents.id, docId))
			.limit(1);

		if (!currentDoc) {
			throw new WorkflowError('Document not found.', 404);
		}

		if (currentDoc.status !== 'approved') {
			throw new WorkflowError('Only approved documents can be published.', 422);
		}

		const updatedRows = await tx
			.update(documents)
			.set({
				status: 'published',
				version: currentDoc.version + 1,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(documents.id, docId),
					eq(documents.version, expectedVersion),
					eq(documents.status, 'approved')
				)
			)
			.returning();

		if (updatedRows.length === 0) {
			throw new WorkflowError(
				'Conflict: Document was modified by another request. Please refresh and try again.',
				409
			);
		}

		const updatedDoc = updatedRows[0];

		await tx.insert(auditEvents).values({
			documentId: docId,
			actorId: user.id,
			action: 'publish',
			previousStatus: 'approved',
			newStatus: 'published',
			version: updatedDoc.version
		});

		return updatedDoc;
	});
}

export async function archiveDocument(user: UserContext, docId: string, expectedVersion: number) {
	if (user.role !== 'admin') {
		throw new WorkflowError('Only administrators can archive documents.', 403);
	}

	const eligibleStates: Array<
		'draft' | 'submitted' | 'approved' | 'rejected' | 'published' | 'archived'
	> = ['draft', 'submitted', 'approved', 'published'];

	return await db.transaction(async (tx) => {
		const [currentDoc] = await tx
			.select()
			.from(documents)
			.where(eq(documents.id, docId))
			.limit(1);

		if (!currentDoc) {
			throw new WorkflowError('Document not found.', 404);
		}

		if (!eligibleStates.includes(currentDoc.status)) {
			throw new WorkflowError(
				`Only documents in state ${eligibleStates.join(', ')} can be archived.`,
				422
			);
		}

		const updatedRows = await tx
			.update(documents)
			.set({
				status: 'archived',
				version: currentDoc.version + 1,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(documents.id, docId),
					eq(documents.version, expectedVersion),
					inArray(documents.status, eligibleStates)
				)
			)
			.returning();

		if (updatedRows.length === 0) {
			throw new WorkflowError(
				'Conflict: Document was modified by another request. Please refresh and try again.',
				409
			);
		}

		const updatedDoc = updatedRows[0];

		await tx.insert(auditEvents).values({
			documentId: docId,
			actorId: user.id,
			action: 'archive',
			previousStatus: currentDoc.status,
			newStatus: 'archived',
			version: updatedDoc.version
		});

		return updatedDoc;
	});
}
