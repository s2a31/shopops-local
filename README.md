# ShopOps Local

A locally runnable e-commerce storefront and administration system, built as a **technical
learning and reference project**. It demonstrates how a modern React / TypeScript / Next.js /
PostgreSQL application is structured, implemented, tested, and documented — as a polished,
reasonably lean modular monolith.

Everything essential runs offline after `pnpm install` and one Docker image pull: no paid
services, no cloud accounts, no API keys.

## Highlights

- **Storefront**: catalogue with URL-driven search/filter/sort/pagination, product detail with
  stock states, persistent cart, checkout with simulated payments, order history and
  cancellation.
- **Admin**: dashboard summaries, product/category management with a local image gallery,
  audited inventory adjustments, order fulfillment with a validated status machine, customer
  list.
- **Foundations**: hand-rolled DB-backed cookie sessions (Argon2id), Origin-validated mutating
  API, integer-cent money, transactional stock decrements that survive races, WCAG-AA-minded
  UI, and a five-layer test suite (unit, component, integration, Playwright E2E, axe).

## Requirements

- Node.js 22 (arm64-native on Apple Silicon)
- pnpm 10
- Docker Desktop (used only for PostgreSQL)

## Getting started

```bash
pnpm install
cp .env.example .env   # local-only defaults; no real secrets anywhere
pnpm db:up             # start PostgreSQL in Docker (waits for healthy)
pnpm db:migrate        # apply database migrations
pnpm db:seed           # load the demo catalogue, accounts, and orders
pnpm dev
```

The app runs at http://localhost:3000.

## Production container (optional)

The normal development loop above is unchanged: Next.js runs on the host and Compose runs only
PostgreSQL. To build the standalone production image:

```bash
docker build --tag shopops-local:prod .
```

Apply migrations before starting a new image; the app container never changes the schema on
startup. On macOS, the existing host-published PostgreSQL service can be reached from the
container through `host.docker.internal`:

```bash
pnpm exec prisma migrate deploy
docker run --rm --name shopops-app \
  --publish 3000:3000 \
  --env DATABASE_URL=postgresql://shopops:shopops_local_dev@host.docker.internal:5432/shopops \
  --env APP_URL=http://localhost:3000 \
  shopops-local:prod
```

`APP_URL` must exactly match the origin used in the browser or mutating requests will be rejected
by the Origin/CSRF guard. For a real deployment, provide both variables through the platform's
secret/configuration system. Registry publishing, automatic migrations, reverse proxy, TLS, and
multi-container orchestration are deliberately outside M16.

## Demo accounts (local demonstration only)

> These are **fictional local demo credentials**, seeded into your local database on purpose
> and published in this README on purpose. They are not secrets and grant access to nothing
> outside your own machine.

| Role          | Email                    | Password           |
| ------------- | ------------------------ | ------------------ |
| Administrator | `admin@shopops.local`    | `DemoAdmin123!`    |
| Customer      | `customer@shopops.local` | `DemoCustomer123!` |

The seed also creates four more demo customers (`mia`, `daniel`, `zoe`, `adam`
`@shopops.local`, password `DemoCustomer123!`) with order history so the admin
screens have realistic data.

Payments are simulated with scenario pickers — **no card-number field exists anywhere**, so
nothing real can be typed in.

## Commands

| Command                  | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `pnpm dev`               | Start the development server                  |
| `pnpm build`             | Production build                              |
| `pnpm start`             | Serve the standalone production build         |
| `pnpm lint`              | ESLint                                        |
| `pnpm format`            | Format with Prettier                          |
| `pnpm format:check`      | Verify formatting                             |
| `pnpm typecheck`         | TypeScript type-check                         |
| `pnpm test`              | Unit + component tests (Vitest)               |
| `pnpm test:integration`  | Service + route tests against real Postgres   |
| `pnpm test:e2e`          | Build + full Playwright suite incl. axe scans |
| `pnpm test:e2e:critical` | Build + the `@critical` PR-gating subset      |
| `pnpm test:e2e:report`   | Open the last Playwright HTML report          |
| `pnpm db:up`             | Start PostgreSQL (Docker)                     |
| `pnpm db:down`           | Stop PostgreSQL (keeps data)                  |
| `pnpm db:destroy`        | Remove container + volume                     |
| `pnpm db:migrate`        | Apply Prisma migrations                       |
| `pnpm db:seed`           | Seed the dev database (idempotent)            |
| `pnpm db:reset`          | Destroy, restart, remigrate, reseed           |
| `pnpm db:test:reset`     | Reset + reseed the isolated test database     |
| `pnpm db:studio`         | Open Prisma Studio                            |

E2E prerequisite once per machine: `pnpm exec playwright install chromium`.

## Testing

Five layers — unit, component, integration (service + route handlers against a real
`shopops_test` database), Playwright E2E (Chromium, one worker, isolated test database on
port 3100), and axe accessibility scans. The dev database is never touched by any suite.
Details, conventions, and the CI stage layout live in [docs/testing.md](docs/testing.md).

## Documentation

| Document                                           | Contents                                                       |
| -------------------------------------------------- | -------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)       | Layering, server/client split, state ownership, error strategy |
| [docs/database.md](docs/database.md)               | The 8-table model, invariants, seed profiles                   |
| [docs/auth.md](docs/auth.md)                       | Sessions, hashing, CSRF/Origin validation, authorization       |
| [docs/api.md](docs/api.md)                         | Every endpoint, the error envelope, business rules             |
| [docs/testing.md](docs/testing.md)                 | Test layers, isolation, Playwright conventions, CI             |
| [docs/decisions.md](docs/decisions.md)             | Pinned versions and per-milestone decisions                    |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Common local setup and test issues                             |
| [docs/limitations.md](docs/limitations.md)         | Deliberate scope cuts and simplifications                      |

## AI-generated project disclosure

This application was created with substantial AI assistance (Claude) and is used as a learning
and reference project. It is not a production shop and must not be treated as one — see
[docs/limitations.md](docs/limitations.md) for what that means concretely.
