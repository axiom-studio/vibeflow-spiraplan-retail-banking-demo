# Retail banking application architecture

VibeFlow project 183 · issue #5517 · 2026-09-28

## Scope and precedence

Implement the 40 existing account, transaction and internal-transfer requirements with the blue-and-white UX specification in document #594. The user's subsequent request adds Node, React, SQLite behind a replaceable database layer, Docker Compose and a test-data publishing tool. This document supersedes #594's in-memory-only state, reload reset and no-persistent-backend assumptions. All other UX requirements remain applicable. Data persists across browser reload and container restart; reset is an explicit development operation.

## Runtime and layout

Use Node 24 LTS, React, TypeScript and Vite. One Node HTTP service serves the built React SPA and JSON API on port 3000. Development uses Vite proxying /api to Node. Keep runtime dependencies small, lock resolved versions, and use native Node SQLite within its adapter.

Proposed directories: server/ (API, service, repository, SQLite adapter), client/ (React views and shared components), tools/ (data publisher), fixtures/ (fictional JSON examples), tests/ (real SQLite/API tests), docs/ (architecture and usage). These are planned paths, not existing code.

## Database boundary

Application services depend on an asynchronous BankingRepository contract, not a SQLite connection or SQL strings. The contract provides user lookup, account listing/lookup, account transaction listing/detail, atomic transfer and atomic fixture import. Adapter methods return domain objects; SQLite rows/errors never leak into React or HTTP contracts. Inject the repository in the service/API factory.

The SQLite adapter alone owns connections, schema/migrations, SQL and transaction boundaries. Parameterize every query; enable foreign keys and a bounded busy timeout. Index accounts by user and transactions by account/date. Use integer cents, check safe integer bounds, and reject unsupported currency. Schema: users; accounts linked to users; transactions linked to accounts; transfers with unique user/idempotency key and source/destination; schema migration version.

Transfer creation is one database transaction: validate ownership, distinct accounts and positive cents; resolve same-key retries (same payload returns original result, changed payload conflicts); verify balance; debit source and credit destination; create two unique transaction postings and one transfer reference; commit. Any error rolls back. SQLite transaction locking must prevent concurrent overdraft. The future PostgreSQL adapter will implement the same contract with its own SQL/migrations/locking. PostgreSQL installation and live data migration are deferred; they are not claimed to work now.

## API and demo identity

The demo defaults to one configured fictional customer. No login screens or real authentication are added. A configured demo-user ID selects the owner; client-supplied account IDs never bypass owner checks. Additional users published by the tool are isolated and can be selected through development configuration.

Planned endpoints:
- GET /api/health: readiness.
- GET /api/accounts: configured customer's accounts.
- GET /api/accounts/:id/transactions: that customer's account transactions.
- GET /api/accounts/:id/transactions/:transactionId: account-scoped detail.
- POST /api/transfers: sourceAccountId, destinationAccountId, amountCents, idempotencyKey; returns committed reference and details.

Responses use consistent JSON errors with a safe code/message. Reject malformed bodies, unknown accounts, wrong ownership, invalid amounts and reused keys with changed payload. Limit JSON body size. Never include SQL or stack traces in client errors. Transfer receipts remain truthful on retries. HTTP integration tests use a real temporary SQLite database.

## React application

Five views: accounts; account transactions; transaction detail; transfer entry/review; receipt. Reuse the 13 component contracts in #594. Keep search/filter/sort client-side for the small demo dataset. Refresh server-authoritative account and transaction state after transfer; do not treat optimistic client arithmetic as a completed transfer. Real loading/error/empty states replace the previous in-memory assumptions. Preserve selection and navigation context. Maintain keyboard flow and responsive required fields.

## Test-data publisher

Provide a local CLI: npm run data:publish -- --file fixtures/example.json, plus a Compose equivalent. It accepts a versioned JSON envelope with users, accounts and transactions. Accounts contain a starting balance in cents. New imported transactions change balance by their signed amount exactly once. Validate references, required fields, types, timestamps, categories, safe cent bounds and currency before writing.

Import is atomic and non-destructive. Stable fixture IDs make re-importing the identical batch a no-op; an existing ID with conflicting content causes the whole batch to fail with a clear message. Check all ownership relationships. Dry-run validates and reports intended counts without writes. Output created/skipped counts and a nonzero exit status on failure. Use the same service/repository entry points as application code. The CLI targets the database file; no publicly accessible write-admin API is added.

Seed fictional examples only when the database is empty. Never reseed/reset on browser reload or server restart. Document fixture format, adding a user/account/transaction, persistence and deliberate reset. The publisher must run inside the app container against the mounted database so it does not accidentally write a second database.

## Docker Compose

Use a multi-stage Node image: install from lockfile, build React/TypeScript, then run only needed runtime artifacts as a non-root user. One app service, healthcheck, and named volume mounted at /data; DATABASE_PATH=/data/banking.sqlite. Bind published port to 127.0.0.1 by default. Run with docker compose up --build. Ensure the volume directory is writable by the runtime user. Use docker compose exec app for publishing into the running application's database. docker compose down preserves data; deleting the named volume is an explicitly documented destructive reset.

## Implementation tracking

1. Architecture/readiness issue #5517: this document, versioned copy and tracker setup.
2. Foundation issue #5518: Node/React/TypeScript scaffold, SQLite repository contract/adapter, migrations, basic health/read API and real database tests.
3. Data-publisher issue #5519: fixture format, validation, atomic idempotent import, CLI, examples and tests; depends on foundation.
4. Accounts todo #3773 under #751: account list/names/balances/search/type/sort, covering #751–755 and #758; depends on foundation.
5. Transactions todo #3774 under #756: accessible selection and complete transaction list, covering #756–765 except #758; depends on accounts.
6. Transaction detail todo #3775 under #766: complete details, selection and return navigation, covering #766–778; depends on transaction list.
7. Transfers todo #3776 under #779: repository/service/API transaction logic and form/review/confirm, covering #779–782, #784 and #791; depends on foundation/accounts.
8. Receipt todo #3777 under #785: committed confirmation and linked transaction records, covering #785–790; depends on transfers.
9. Container/runbook issue #5520: Dockerfile, Compose volume/healthcheck/publisher and clean-run/persistence checks; depends on foundation/publisher and UI tasks.

Each grouped todo explicitly records every covered requirement. Sibling requirement features are set ready now and completed only when the grouped implementation and its acceptance checks pass. No duplicate page or implementation is created for a single-field requirement. All work targets main.

## Validation

Run typecheck/build and appropriate linting. Use actual temporary SQLite files and actual HTTP handlers, not mocks. Verify persistence after reopen, cross-user isolation, import rollback/idempotency/conflicts/dry-run, exact-cent transfers, duplicate retries, changed-payload conflicts, insufficient funds and concurrent requests. Exercise the browser at desktop/mobile sizes with keyboard navigation. Build and run Compose, publish sample data inside it, inspect UI/API, restart and verify data remains. Record any unavailable runtime checks honestly.

## References

- UX design: VibeFlow document #594.
- Node release policy: https://github.com/nodejs/Release
- React versions: https://react.dev/versions
- Vite requirements: https://vite.dev/guide/
