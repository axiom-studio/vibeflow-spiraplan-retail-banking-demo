# Axiom Bank retail demo

A Node/React banking demo built with VibeFlow and SpiraPlan. Browse accounts, search/filter/sort, inspect transactions, and review and confirm internal transfers. SQLite persists balances, paired ledger postings and reloadable receipts. All money and customer data are fictional; the configured demo identity is not authentication.

## Run with Docker Compose

Install Docker with Compose and start its engine, then run:

```sh
docker compose up --build -d --wait
```

Open http://127.0.0.1:3000. If that port is busy, use `BANKING_PORT=3180 docker compose up --build -d --wait` and open port 3180. The image builds and tests on Node 24, runs as the non-root `node` user, and serves both the React UI and JSON API. The published port binds to loopback only. Inspect health and logs with `docker compose ps` and `docker compose logs app`.

The first empty database receives three fictional accounts and sample transactions. The named `banking-data` volume preserves data across browser reload, `docker compose restart`, and `docker compose down`. Bring the same Compose project back up to reuse it. Do not change the project name when you intend to reuse its volume.

```sh
docker compose exec app node dist/tools/publish.js --file fixtures/example.json --dry-run
docker compose exec app node dist/tools/publish.js --file fixtures/example.json
```

Identical fixture IDs are skipped. To import your own fictional data, copy the JSON file into the running container, then publish it against the same mounted database:

```sh
docker compose cp ./my-fixture.json app:/tmp/my-fixture.json
docker compose exec app node dist/tools/publish.js --file /tmp/my-fixture.json
```

See [fixture format and publishing rules](docs/data-publisher.md). To browse another published customer, recreate the app with `DEMO_USER_ID=customer-id docker compose up -d --force-recreate`.

Stop while preserving data: `docker compose down`. **To deliberately delete all demo data**, use `docker compose down --volumes`; the next startup seeds a fresh database.

## Run locally

Use Node 24 or newer:

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally http://127.0.0.1:5173). Vite proxies `/api` to Node on port 3000. For a built app, run `npm run build` followed by `npm start`, then open http://127.0.0.1:3000. Local SQLite defaults to `data/banking.sqlite`; `DATABASE_PATH`, `PORT` and `DEMO_USER_ID` configure the server. The native backend currently binds all interfaces; use Compose's loopback publishing for the local-only network boundary (tracked remediation #5521).

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Tests use real SQLite files, HTTP servers and competing processes. If `agent-browser` is installed, start the app against a disposable seeded database and run:

```sh
node tests/browser-skip.mjs http://127.0.0.1:3000
node tests/browser-transfer.mjs http://127.0.0.1:3000
```

The transfer browser check moves $10 in fictional funds and checks both postings and receipt reload. It is not a read-only check.

## Structure

- `client/`: React screens, shared components and exact-cent input parsing.
- `server/`: Express API and database-neutral `BankingRepository`; SQLite adapter owns SQL and atomic operations.
- `tools/` and `fixtures/`: local publishing CLI and fictional examples.
- `tests/`: real database/API, rendering and optional browser checks.
- [Architecture](docs/architecture.md): contracts, ownership and persistence decisions.

A future PostgreSQL adapter can implement the same repository contract with its own migrations and transaction locking. PostgreSQL is not implemented. This demo has no real login or banking integrations.

Docker configuration follows the [Compose service reference](https://docs.docker.com/reference/compose-file/services/) and [official Node image](https://github.com/nodejs/docker-node).
