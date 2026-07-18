import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db';
import { users, documents, auditEvents } from './db/schema';
import { eq } from 'drizzle-orm';
import {
	createDraft,
	editDocument,
	submitForReview,
	approveDocument,
	rejectDocument,
	reopenDocument,
	publishDocument,
	archiveDocument,
	WorkflowError,
	type UserContext
} from './workflow';

describe('Workflow Service Integration Tests', () => {
	let alice: UserContext;
	let bob: UserContext;
	let admin: UserContext;
	let viewer: UserContext;

	beforeAll(async () => {
		// Retrieve seeded users
		const allUsers = await db.select().from(users);
		
		const aliceDb = allUsers.find((u) => u.email === 'alice@example.com');
		const bobDb = allUsers.find((u) => u.email === 'bob@example.com');
		const adminDb = allUsers.find((u) => u.email === 'admin@example.com');
		const viewerDb = allUsers.find((u) => u.email === 'viewer@example.com');

		if (!aliceDb || !bobDb || !adminDb || !viewerDb) {
			throw new Error('Seeded users not found in database. Run npm run seed first.');
		}

		alice = { id: aliceDb.id, name: aliceDb.name, email: aliceDb.email, role: 'author' };
		bob = { id: bobDb.id, name: bobDb.name, email: bobDb.email, role: 'reviewer' };
		admin = { id: adminDb.id, name: adminDb.name, email: adminDb.email, role: 'admin' };
		viewer = { id: viewerDb.id, name: viewerDb.name, email: viewerDb.email, role: 'viewer' };
	});

	it('should allow author to create draft and log audit event', async () => {
		const doc = await createDraft(alice, 'Initial Title', 'Initial Body');
		expect(doc.id).toBeDefined();
		expect(doc.title).toBe('Initial Title');
		expect(doc.status).toBe('draft');
		expect(doc.version).toBe(1);

		// Verify audit event
		const events = await db.select().from(auditEvents).where(eq(auditEvents.documentId, doc.id));
		expect(events.length).toBe(1);
		expect(events[0].action).toBe('create');
		expect(events[0].newStatus).toBe('draft');
		expect(events[0].actorId).toBe(alice.id);
	});

	it('should block non-authors from creating draft', async () => {
		await expect(createDraft(bob, 'Title', 'Body')).rejects.toThrowError(
			new WorkflowError('Only authors can create document drafts.', 403)
		);
	});

	it('should allow owning author to edit draft', async () => {
		const doc = await createDraft(alice, 'Title', 'Body');
		const edited = await editDocument(alice, doc.id, 1, 'Updated Title', 'Updated Body');
		expect(edited.title).toBe('Updated Title');
		expect(edited.version).toBe(2);

		const events = await db.select().from(auditEvents).where(eq(auditEvents.documentId, doc.id));
		expect(events.length).toBe(2); // create and edit
		expect(events[1].action).toBe('edit');
		expect(events[1].version).toBe(2);
	});

	it('should prevent other roles from editing author draft', async () => {
		const doc = await createDraft(alice, 'Title', 'Body');
		await expect(editDocument(bob, doc.id, 1, 'Sneaky Title', 'Sneaky Body')).rejects.toThrowError(
			new WorkflowError('Unauthorized to edit this document.', 403)
		);
	});

	it('should handle optimistic concurrency on edit (Bob/Carol stale update)', async () => {
		const doc = await createDraft(alice, 'Title', 'Body');
		
		// Attempt edit with correct version
		await editDocument(alice, doc.id, 1, 'First Edit', 'Body');

		// Attempt edit with stale version 1
		await expect(editDocument(alice, doc.id, 1, 'Stale Edit', 'Body')).rejects.toThrowError(
			WorkflowError
		);
	});

	it('should prevent reviewer from approving their own document', async () => {
		// Insert a document where bob is the author (e.g. simulated by directly inserting,
		// and then invoking approveDocument).
		// Note: Reviewers cannot normally create documents, but we check if we directly assign
		// author_id = bob.id.
		const [doc] = await db.insert(documents).values({
			title: 'Bob Own Doc',
			body: 'Content',
			status: 'submitted',
			authorId: bob.id,
			version: 1
		}).returning();

		await expect(approveDocument(bob, doc.id, 1)).rejects.toThrowError(
			new WorkflowError('Reviewers cannot approve their own documents.', 403)
		);
	});

	it('should require rejection comment', async () => {
		const doc = await createDraft(alice, 'Title', 'Body');
		await submitForReview(alice, doc.id, 1);

		await expect(rejectDocument(bob, doc.id, 2, '')).rejects.toThrowError(
			new WorkflowError('Rejection comment is required.', 422)
		);
	});

	it('should transition through full happy path', async () => {
		// 1. Create draft
		const doc = await createDraft(alice, 'Happy Path', 'Let\'s go');
		expect(doc.status).toBe('draft');

		// 2. Submit
		const submitted = await submitForReview(alice, doc.id, 1);
		expect(submitted.status).toBe('submitted');

		// 3. Approve
		const approved = await approveDocument(bob, doc.id, 2);
		expect(approved.status).toBe('approved');

		// 4. Publish
		const published = await publishDocument(bob, doc.id, 3);
		expect(published.status).toBe('published');

		// 5. Archive
		const archived = await archiveDocument(admin, doc.id, 4);
		expect(archived.status).toBe('archived');

		// Verify audit logs for entire lifecycle
		const logs = await db.select().from(auditEvents).where(eq(auditEvents.documentId, doc.id));
		expect(logs.length).toBe(5);
		expect(logs[0].action).toBe('create');
		expect(logs[1].action).toBe('submit');
		expect(logs[2].action).toBe('approve');
		expect(logs[3].action).toBe('publish');
		expect(logs[4].action).toBe('archive');
	});
});
