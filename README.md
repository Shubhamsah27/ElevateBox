# Controlled Document Approval System

A correctness-first, full-stack workflow application for controlled authoring, review, publication, archival, and append-only audit history. Built using **SvelteKit 5**, **TypeScript**, **PostgreSQL**, and **Drizzle ORM**.

---

## Document Workflow

```mermaid
flowchart LR
    A["Author creates draft"] --> B["Draft"]
    B -->|"Edit"| B
    B -->|"Submit for review"| C["Submitted"]
    C -->|"Reviewer approves"| D["Approved"]
    C -->|"Reviewer rejects with comment"| E["Rejected"]
    E -->|"Author reopens"| B
    D -->|"Reviewer or Admin publishes"| F["Published"]
    F -->|"Visible to all authenticated roles"| G["Controlled access"]
    B -->|"Admin archives"| H["Archived"]
    C -->|"Admin archives"| H
    D -->|"Admin archives"| H
    F -->|"Admin archives"| H

    classDef author fill:#4c1d95,stroke:#a78bfa,color:#ffffff
    classDef reviewer fill:#075985,stroke:#38bdf8,color:#ffffff
    classDef success fill:#065f46,stroke:#34d399,color:#ffffff
    classDef warning fill:#7f1d1d,stroke:#f87171,color:#ffffff
    classDef archive fill:#78350f,stroke:#fbbf24,color:#ffffff

    class A,B author
    class C,D reviewer
    class F,G success
    class E warning
    class H archive
```

Every transition is authorization-checked, versioned with optimistic concurrency control, and recorded in the audit timeline.

---

## 1. Prerequisites
Before running the application, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v20.6.0 or higher is required)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

---

## 2. Setup & Installation

### Step 1: Clone & Install Dependencies
```bash
npm install
```

### Step 2: Start PostgreSQL Database Container
Use Docker Compose to launch the database container (configured on port `5433` to prevent conflicts with local services):
```bash
docker compose up -d
```

### Step 3: Run Database Migrations
Deploy the database schema:
```bash
npx drizzle-kit push --force
```

### Step 4: Seed the Database
Populate the database with the required seeded users:
```bash
npx tsx src/lib/server/db/seed.ts
```

---

## 3. Seeded Accounts
You can switch between these profiles at any time using the **Simulate Role dropdown** located in the top navigation bar.

| User Email | Role | Capabilities |
| :--- | :--- | :--- |
| `alice@example.com` | Author | Create draft, edit draft/rejected own docs, submit for review, reopen rejected own docs |
| `bob@example.com` | Reviewer | Approve submitted documents (except own), reject with comment, publish approved |
| `admin@example.com` | Admin | Publish approved documents, archive active documents |
| `viewer@example.com` | Viewer | View published documents only |

---

## 4. Running the Application
To run the full-stack SvelteKit application locally:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Testing
The project includes a comprehensive test suite covering integration and E2E requirements:

### Run Backend Integration Tests (Vitest)
Verifies database integrity, role authorization, state transition guards, and optimistic concurrency rules:
```bash
npm run test:unit -- --run
```

### Run End-to-End Tests (Playwright)
Executes the happy path E2E flow (Author creates -> edits -> submits -> Reviewer approves -> Admin publishes -> Viewer accesses -> Audit timeline check):
```bash
npm run test:e2e:install # first run only
npm run test:e2e
```

> Use a dedicated test database when running the integration or E2E suites. They create workflow records as part of validation and should not point at production data.
