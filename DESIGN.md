# System Design & Architecture Note

This document details the architectural decisions, system invariants, security models, and concurrency controls designed for the Controlled Document Approval System.

---

## 1. System Invariants

The core requirement of this application is **correctness-first workflow governance**. The system enforces the following invariants:

### A. State Machine Integrity
A document can only transition through authorized pathways defined by the state machine:
- `draft` → `submitted` (Owning author)
- `submitted` → `approved` (Reviewer, must not be owning author)
- `submitted` → `rejected` (Reviewer, comment required)
- `rejected` → `draft` (Owning author)
- `approved` → `published` (Reviewer or Admin)
- `draft / submitted / approved / published` → `archived` (Admin)

### B. Transactional Audit Log Consistency
- Every state mutation must commit a matching audit log record capturing the actor, action, timestamp, versions, and optional comments.
- If either the document state update or the audit event insert fails, the database transaction rolls back, leaving no trace.

### C. Concurrency Invariant (Optimistic Concurrency Control)
- No mutation can occur if the version the client has does not match the database's version.
- Stale updates are aborted cleanly, preventing silent overwrites.

---

## 2. Database vs. Application Enforcement

### Database-Enforced Invariants
- **Referential Integrity**: Foreign keys ensure all documents and sessions map to a valid user, and audit events always link to a valid document and actor.
- **Constraints**: Required fields (`NOT NULL`) and uniqueness of user emails are enforced at the database level.
- **Cascades**: Deleting a session or document cascades to clean up dependent records, avoiding orphaned rows.

### Application-Enforced Invariants
- **State Machine Transitions**: State checks are validated server-side in `workflow.ts` before issuing database updates.
- **Role & Ownership Authorization**: Checked server-side matching the session token.
- **Self-Approval Prevention**: The system checks `currentDoc.authorId !== user.id` during the approval phase.
- **Validation Rules**: Empty title/body checks and mandatory comments for rejection.

---

## 3. Permission Model & Visibility Boundaries

Authorization check logic resides in `src/lib/server/workflow.ts` and route guards in `src/hooks.server.ts`:
- **Unauthenticated**: Redirected to `/login`.
- **Viewer**: Read-only access *strictly* to `published` documents.
- **Author**: Access to own documents (any status) and other authors' `published` documents.
- **Reviewer**: Access to `submitted`, `approved`, `rejected`, and `published` documents. Prevented from approving own documents.
- **Admin**: Full read access to all active and `archived` documents, and exclusive archive capabilities.

---

## 4. Stale & Conflicting Update Prevention (OCC)

To prevent the **Bob/Carol concurrent update scenario**, the system implements Optimistic Concurrency Control (OCC):
1. The document table tracks an integer `version` field.
2. Every form action mutation transmits the `version` the client currently views.
3. The SQL update statement filters on document ID, required state, and version:
   ```sql
   UPDATE documents 
   SET status = 'approved', version = version + 1 
   WHERE id = $1 AND version = $2 AND status = 'submitted';
   ```
4. If this query returns `0` affected rows, it indicates another update occurred. The transaction aborts, throws a `409 Conflict`, and inserts no audit event.
5. The UI handles the conflict by showing a banner instructing the user to refresh the page.

---

## 5. Considered Failure Cases
- **Unauthenticated Private Request**: Blocked in SvelteKit hooks server-side.
- **Audit Event Write Failure**: Database transaction rolls back the document status update.
- **Stale Expected Version**: Transaction rolls back with a 409 error.
- **Missing Rejection Comment**: Blocked by the server before transaction start (returns 422).
