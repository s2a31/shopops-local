# Testing

Five layers, each with a distinct job. Everything runs locally with the same commands CI uses.

| Layer       | Tool                                                  | What belongs there                                                                                                                                                                                                                                                                         | Database       |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Unit        | Vitest (`src/**/*.test.ts`)                           | money math, shipping rule, status transitions, Zod schemas, slug helpers, cart-store actions                                                                                                                                                                                               | none           |
| Component   | Vitest + RTL + happy-dom (`src/**/*.test.tsx`)        | forms (validation messages, a11y wiring), cards, cart drawer/page, pagination, admin table states                                                                                                                                                                                          | none           |
| Integration | Vitest project `integration` (`tests/integration/**`) | service-layer domain logic **and** route-handler wire behavior (hybrid architecture): checkout success/decline/insufficient stock, the parallel-checkout race, cancellation stock restore, adjustment-sum invariant, session expiry, 401/403 boundaries, Origin rejection, error envelopes | `shopops_test` |
| E2E         | Playwright (`e2e/*.spec.ts`)                          | 22 scenario files across auth, catalogue, cart, checkout, orders, admin, mobile, keyboard-only                                                                                                                                                                                             | `shopops_test` |
| A11y        | `@axe-core/playwright` (`e2e/axe/`)                   | storefront + admin scans; serious/critical violations fail the run                                                                                                                                                                                                                         | `shopops_test` |

## Commands

| Command                  | Runs                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| `pnpm test`              | unit + component projects                                              |
| `pnpm test:integration`  | integration project (needs `pnpm db:up`)                               |
| `pnpm test:e2e`          | production build + full Playwright suite (desktop + mobile projects)   |
| `pnpm test:e2e:critical` | build + the `@critical` PR-gating subset                               |
| `pnpm test:e2e:report`   | open the last HTML report                                              |
| `pnpm db:test:reset`     | reset + reseed `shopops_test` manually (the suites do this themselves) |

## Test-data isolation

- The Postgres container hosts `shopops` (dev) and `shopops_test`; **no suite ever touches the
  dev database**. Both the integration global setup and `scripts/reset-test-db.ts` refuse to
  run if `DATABASE_URL` does not contain `shopops_test`.
- Integration: global setup loads `.env.test` and applies migrations; a `resetDb()` helper
  truncates between test files; files run sequentially (`fileParallelism: false`).
- E2E: the Playwright global setup reseeds with the `e2e` profile (fixed fixtures such as the
  one-unit product), then Playwright's `webServer` starts the **production build** on port
  3100 with `.env.test`, matching `APP_URL` so Origin validation passes.
- Registration specs use timestamp-unique emails; mutating specs create their own fresh orders
  through the API or pin fixture stock through the audited admin adjustment endpoint, so specs
  stay order-independent and retry-safe.

## Playwright conventions

- Chromium only by default, **one worker**, retries 0 locally / 1 in CI, HTML report,
  trace on first retry. The `mobile` project is Chromium with the iPhone-14 viewport
  (the device preset's WebKit default is overridden; WebKit is not installed).
- A `setup` project signs the demo customer and admin in once through the API and saves
  storage states under `e2e/.auth/` (gitignored); specs reuse them and stay clear of the
  login rate limiter. Specs whose subject is authentication drive the login UI.
- Locators: `getByRole` / `getByLabel` / scoped `getByText` only — doubling as an
  accessibility check. No `waitForTimeout`; web-first assertions only.
- `@critical` tags the PR-gating money paths: registration, login, all three checkout
  outcomes, both insufficient-stock behaviors, the admin status transition, and the
  customer-blocked-from-admin boundary.

## Hard-won locator rules

- `getByText("…")` with a string matches **case-insensitive substrings** — "Total" also
  matches "Subtotal", "Cancelled" also matches "…can be cancelled…". Prefer roles, or pass
  `{ exact: true }`.
- Next's route announcer is `role="alert"`, so alert assertions always filter by content.
- Streamed pages (`loading.tsx`) send headers before `notFound()` resolves — page-level 404s
  return HTTP 200 and must be asserted via the rendered 404 page; wire-level 404s are
  integration-test territory.

## CI

`.github/workflows/ci.yml` stages the same commands: `quality` (format, lint, types, unit +
component) and `integration-build` (Postgres service container → integration tests →
production build) run on every push and PR; the `@critical` Playwright subset gates PRs; the
full suite + axe scans run on pushes to main, nightly, and on manual dispatch, uploading the
HTML report as an artifact. A red full run on main is a fix-first signal. Local functionality
never depends on CI.
