# Troubleshooting

## `pnpm db:up` fails or hangs

- Docker Desktop must be running. `docker ps` should answer without an error.
- Port 5432 already in use? Another local Postgres (Homebrew?) is listening. Stop it or change
  the port mapping in `docker-compose.yml` (and `DATABASE_URL` in your `.env`).
- The compose service waits for a healthcheck; first start pulls `postgres:17-alpine` once.

## "Could not migrate/reset the test database. Is Postgres running?"

Integration and E2E suites talk to the `shopops_test` database in the same container:
`pnpm db:up` first. If the container predates the test-database init script, recreate it with
`pnpm db:reset` (destroys the **dev** volume) — the init script in `docker/postgres-init/`
creates `shopops_test` on first container start.

## `DATABASE_URL` / `APP_URL` startup error

The env validation module fails fast when either is missing. Copy the template:
`cp .env.example .env`. Tests never read your `.env` — they load the committed `.env.test`.

## Login says "Too many attempts"

The in-process limiter allows a handful of attempts per email + IP in a fixed window. Wait it
out or restart the dev server (the limiter is memory-only and resets on restart).

## Playwright: "Executable doesn't exist"

Browsers are installed separately from npm packages: `pnpm exec playwright install chromium`.
The suite is Chromium-only by design — the mobile project also runs on Chromium.

## E2E failures with the app seemingly not updated

`pnpm test:e2e` rebuilds first, but a manually started `pnpm start` on port 3100 is **reused**
locally (`reuseExistingServer`). Stop stray servers on 3100 if results look stale:
`lsof -ti :3100 | xargs kill`.

## Prisma client out of date after pulling migrations

`pnpm db:migrate` regenerates the client. If types still look stale, `pnpm exec prisma
generate` and restart the TypeScript server in your editor.

## Port 3000 in use

Another `next dev` is running somewhere. `lsof -ti :3000 | xargs kill`, or run on another port
with `PORT=3001 pnpm dev` (remember `APP_URL` must match the origin you actually browse, or
every mutating request is rejected with 403).

## Seeded data looks wrong / demo orders missing

`pnpm db:seed` is idempotent per unique keys but does not delete rows. For a pristine dev
database: `pnpm db:reset` (destroy + migrate + reseed). The test database has its own
equivalent: `pnpm db:test:reset`.
