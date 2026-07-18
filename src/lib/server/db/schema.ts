import { pgTable, text, timestamp, integer, uuid, pgEnum, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userRole = pgEnum('user_role', ['author', 'reviewer', 'admin', 'viewer']);
export const documentStatus = pgEnum('document_status', [
	'draft',
	'submitted',
	'approved',
	'rejected',
	'published',
	'archived'
]);
export const auditAction = pgEnum('audit_action', [
	'create',
	'edit',
	'submit',
	'approve',
	'reject',
	'reopen',
	'publish',
	'archive'
]);

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	role: userRole('role').notNull()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const documents = pgTable('documents', {
	id: uuid('id').defaultRandom().primaryKey(),
	title: text('title').notNull(),
	body: text('body').notNull(),
	status: documentStatus('status').notNull(),
	authorId: uuid('author_id')
		.notNull()
		.references(() => users.id),
	version: integer('version').notNull().default(1),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull()
	}, (table) => [check('documents_version_positive', sql`${table.version} > 0`)]);

export const auditEvents = pgTable('audit_events', {
	id: uuid('id').defaultRandom().primaryKey(),
	documentId: uuid('document_id')
		.notNull()
		.references(() => documents.id, { onDelete: 'restrict' }),
	actorId: uuid('actor_id')
		.notNull()
		.references(() => users.id),
	action: auditAction('action').notNull(),
	timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' })
		.defaultNow()
		.notNull(),
	comment: text('comment'),
	previousStatus: text('previous_status'),
	newStatus: text('new_status'),
	version: integer('version').notNull()
	}, (table) => [check('audit_events_version_positive', sql`${table.version} > 0`)]);
