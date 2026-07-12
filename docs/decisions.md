# Technology decisions

This file records the major technology choices and the exact versions pinned at project start
(M0, 2026-07-11). Per the project's version policy, dependency versions are **pinned exactly**
(no `^`/`~` ranges — enforced by `.npmrc` `save-exact=true`), `pnpm-lock.yaml` is committed, and
no opportunistic upgrades happen during v1 implementation.

## Pinned core versions (M0)

| Tool / library    | Version | Notes                                                     |
| ----------------- | ------- | --------------------------------------------------------- |
| Node.js           | 22.x    | Runtime (developer machine, CI)                           |
| pnpm              | 10.25   | Package manager                                           |
| Next.js           | 16.2.10 | App Router; Turbopack dev server                          |
| React / React DOM | 19.2.4  | Ships with Next                                           |
| TypeScript        | 5.9.3   | `strict` + `noUncheckedIndexedAccess`                     |
| Tailwind CSS      | 4.3.2   | With `@tailwindcss/postcss`                               |
| ESLint            | 9.39.5  | Flat config + `eslint-config-next` 16.2.10                |
| Prettier          | 3.9.5   | With `eslint-config-prettier` 10.1.8 (disables conflicts) |
| @types/node       | 22.20.1 | Matches the Node 22 runtime                               |

Versions for later-milestone dependencies (Zod, TanStack Query, Zustand, RHF, Radix, Vitest,
Playwright, `@node-rs/argon2`, …) are pinned in the milestone that introduces them and recorded
here at that time.

## Pinned at M1 (database)

| Tool / library          | Version   | Notes                                             |
| ----------------------- | --------- | ------------------------------------------------- |
| Prisma / @prisma/client | 6.19.3    | Prisma 7 was newly released at project start; 6.x |
|                         |           | chosen for maturity and documentation stability   |
| PostgreSQL              | 17-alpine | Official multi-arch image; native arm64           |

## Pinned at M3 (auth + validation + tests)

| Tool / library  | Version | Notes                                              |
| --------------- | ------- | -------------------------------------------------- |
| zod             | 4.4.3   | Shared client/server validation schemas            |
| react-hook-form | 7.81.0  | Complex forms only, with @hookform/resolvers 5.4.0 |
| @node-rs/argon2 | 2.0.2   | Argon2id, prebuilt arm64 binaries (no node-gyp)    |
| vitest          | 4.1.10  | Unit + integration projects (v4 is current stable) |

Additional M3 decisions:

- **Hand-rolled DB sessions** (no Auth.js/Lucia): 32-byte random token in an httpOnly
  SameSite=Lax cookie; the database stores only the SHA-256 hash; 30-day expiry with sliding
  renewal below 15 days. Rationale: external providers are forbidden, and the mechanics are the
  point of a learning repo. Design details in `docs/auth.md` (written at M15).
- **Origin-header validation** on every POST/PUT/PATCH/DELETE, enforced centrally in the
  `apiRoute` wrapper so no endpoint can forget it (CSRF defense in depth with SameSite=Lax).
- **Next 16 `proxy.ts`** (the renamed middleware) does optimistic cookie-presence redirects
  only; real auth checks live in layouts and API guards, which validate against the database.
- **`forbidden()`/`unauthorized()` file conventions not used** — still experimental in Next 16
  (`authInterrupts`); we use a plain `/403` page instead.

## Pinned at M4 (UI kit)

| Tool / library               | Version       | Notes                                                                                                                                 |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| radix-ui (unified package)   | 1.6.2         | Primitives behind the vendored components                                                                                             |
| lucide-react                 | 1.24.0        | Icon set used by the vendored components                                                                                              |
| sonner                       | 2.0.7         | Toast notifications (see note below)                                                                                                  |
| class-variance-authority     | 0.7.1         | Variant styling in vendored components                                                                                                |
| clsx / tailwind-merge        | 2.1.1 / 3.6.0 | `cn()` helper                                                                                                                         |
| tw-animate-css / next-themes | 1.4.0 / 0.4.6 | Animation utilities; theme hook sonner needs                                                                                          |
| shadcn (devDependency)       | 4.13.0        | Build-time only: `@import "shadcn/tailwind.css"` provides keyframes/variants for the vendored components. Never a runtime dependency. |

## Pinned at M5 (catalogue + component tests)

| Tool / library              | Version | Notes                                   |
| --------------------------- | ------- | --------------------------------------- |
| @testing-library/react      | 16.3.2  | Component tests                         |
| @testing-library/user-event | 14.6.1  | Interaction simulation                  |
| @testing-library/jest-dom   | 6.9.1   | DOM matchers (vitest setup)             |
| happy-dom                   | 20.10.6 | Component-test DOM environment          |
| @vitejs/plugin-react        | 6.0.3   | JSX transform for the component project |

## Pinned at M6 (cart)

| Tool / library        | Version | Notes                                       |
| --------------------- | ------- | ------------------------------------------- |
| zustand               | 5.0.14  | Cart lines + drawer-open flag, nothing else |
| @tanstack/react-query | 5.101.2 | Cart validation query; admin tables from M9 |

## M13 (a11y & polish pass) — no new dependencies

Additional M13 decisions:

- **Contrast was audited with computed styles in the browser** (canvas-normalized
  colors, WCAG relative-luminance math) across the key pages; automated axe scans
  arrive with the Playwright setup in M14. One systemic failure was found and fixed:
  the destructive badge ("Out of stock", "Cancelled") was 3.97:1 — its text now uses
  the darker `red-700` on the tinted background (5.3:1).
- **`motion-reduce:` variants cover every animated primitive** (skeleton pulse,
  dialog/sheet/select/dropdown enter-exit, toast spinner); sonner itself already
  respects `prefers-reduced-motion`.
- **Every route group has a `loading.tsx`** pairing skeletons with a visually hidden
  `role="status"` announcement and `aria-busy`.
- **The storefront header goes icon-only below `sm`** (cart and account keep their
  accessible names via `sr-only` text) instead of adding a hamburger menu — with two
  nav links a disclosure menu would cost more a11y surface than it saves.
- **The M3 auth forms were aligned with the M4 UI kit** (Input/Label/Button replace
  raw zinc-styled elements), which also gave them the kit's `aria-invalid` styling.
- Disabled pagination placeholders are `aria-hidden` and exempt from contrast rules
  by WCAG 1.4.3 (inactive controls); real pagination links are unaffected.

## M12 (admin orders + customers) — no new dependencies

Additional M12 decisions:

- **One status machine, one module** (`src/features/orders/transitions.ts`): the
  transition table drives both the server-side validation in `admin.service` and the
  options offered by the admin UI control, so the client can never offer a move the
  server would reject. Customer cancellation (PLACED only) stays separately enforced
  in `order.service`.
- **Status flips are conditional updates** (`updateMany` guarded by the previously
  read status), so a concurrent admin transition or customer cancellation loses
  cleanly with a 409 instead of double-applying side effects — stock can never be
  restored twice for one cancellation.
- **Payment side effects ride the same transaction**: delivering a cash-on-delivery
  order marks its payment PAID; cancelling a paid card order flags it REFUNDED.
  Admin cancellation restores stock with `ORDER_CANCELLED` ledger rows in the same
  deterministic productId order checkout uses.
- **Customer aggregates exclude cancelled orders**: `totalSpentCents` sums only
  non-cancelled orders (in integer cents); `orderCount` counts every order. The
  service returns an explicit non-sensitive field list — password hashes never leave
  the database layer.

## M11 (admin inventory) — no new dependencies

Additional M11 decisions:

- **Adjustments use the same guarded-update pattern as checkout**: a single
  `updateMany` with `stockQuantity >= -delta` in the WHERE clause applies the change
  atomically and refuses to go below zero (409 with the remaining quantity in
  `details`); the ledger row is written in the same transaction.
- **Admins may only pick RESTOCK or MANUAL_CORRECTION** — the other ledger reasons
  (INITIAL_STOCK, ORDER_PLACED, ORDER_CANCELLED) are written exclusively by services.
- **The audit log shows attribution**: the acting admin's name for manual changes,
  "System — SO-…" for order-driven ones. History can be scoped to one product from
  its stock row.
- **Sum-of-deltas invariant is asserted in an integration test**: after any sequence
  of adjustments, `stockQuantity` equals the sum of the product's ledger deltas.

## M10 (admin catalogue) — no new dependencies

Additional M10 decisions:

- **Slug stability**: renaming a product or category never changes its slug; the slug
  changes only when the admin edits the slug field deliberately (hint text says so in
  both forms). Slugs derive from names via NFKD normalization with all combining marks
  (`\p{M}`) stripped; names with no ASCII decomposition require an explicit slug.
- **Prices are typed in euros** ("79.90" or "79,90") and converted to integer cents at
  the Zod boundary of the form schema — the wire and everything behind it stay integral.
- **The image picker lists `public/images/products/` at request time** (`fs.readdir` in
  a server page) instead of a committed manifest, so newly generated artwork appears
  without a code change. The wire schema still rejects anything outside that folder.
- **Product stock is read-only in the edit form** — it changes only through audited
  inventory adjustments (M11); the create form's initial stock writes an
  `INITIAL_STOCK` ledger entry attributed to the acting admin.
- **Categories are managed in dialogs** on one page (list + create + edit); no
  category delete in v1, as planned.

## M9 (admin shell + dashboard) — no new dependencies

Additional M9 decisions:

- **Dashboard revenue = all non-cancelled orders of the last 30 days** (COD counts when
  placed). This is demo revenue for a learning dashboard, not accounting; the definition
  is stated on the dashboard card itself.
- **Top products ignore cancelled orders** and rank by units sold (Prisma `groupBy` over
  order items with a relation filter).
- **Low-stock query compares columns** (`stockQuantity <= lowStockThreshold`) using Prisma
  field references — no threshold duplication in application code.

## M8 (customer orders) — no new dependencies

Additional M8 decisions:

- **Cancellation flips the order status with a conditional update**
  (`WHERE status = 'PLACED'`) inside the transaction, so a concurrent cancel or admin
  transition can never restore stock twice. Stock restores use the same deterministic
  productId ordering as checkout decrements.
- **Cancelled COD orders keep payment status PENDING** — nothing was ever paid. Only paid
  simulated-card payments flip to REFUNDED.
- **Order history clamps page overflow to the last page**, matching the catalogue's
  behavior from M5.

## M7 (checkout) — no new dependencies

Additional M7 decisions:

- **Declined simulated payments resolve before the transaction opens** — a decline throws
  before any database write, so there is no order row, no stock movement, and nothing to
  clean up.
- **Stock is taken with conditional decrements in deterministic productId order**
  (`UPDATE … WHERE "stockQuantity" >= qty` on sorted lines). Concurrent checkouts cannot
  deadlock, and when two buyers race for the last unit exactly one succeeds — covered by a
  dedicated race integration test.
- **Checkout prefills the shipping form from the customer's most recent order**, the
  documented v1 substitute for an address book.
- **Route-handler tests stub the `next/headers` cookie store** (and neutralize React
  `cache`) because invoking a handler directly provides no Next request scope. Wire-level
  cookie tests over real HTTP arrive with the M14 api project.
- **An untouched radio group reports `null` in react-hook-form**, so the checkout form
  schema treats a null scenario as "not chosen yet" and shows the friendly refine message
  instead of a type error.

Additional M6 decisions:

- **The cart stores only `{ productId, quantity }`** in localStorage. Prices, names, and stock
  always come from `POST /api/cart/validate`, so stale-price bugs are structurally impossible
  and the response includes per-line issues (MISSING / INACTIVE / OUT_OF_STOCK /
  INSUFFICIENT_STOCK) plus canonical totals.
- **Persisted state is untrusted**: localStorage contents pass through a sanitizer on hydrate
  (malformed entries dropped, duplicates merged, quantities clamped, line cap enforced).
- **Hydration-safe rendering** via `useSyncExternalStore` (server snapshot false → client
  true); cart-derived UI renders only after hydration, avoiding React mismatches. The newer
  `react-hooks/set-state-in-effect` lint rule pushed us to this pattern over a mount effect.
- **Validation endpoint always returns 200** — line problems are data for the UI, not
  transport errors; the Origin check still applies (POST).

Additional M5 decisions:

- **Catalogue filtering is a plain GET form + URL state** — server-rendered, shareable,
  back-button-safe, and fully functional without client JavaScript. TanStack Query is
  deliberately not used here.
- **Prices in URLs are whole euros** (`?minPrice=10`) for readability; converted to cents at
  the service boundary. Blank form fields are treated as "no filter" (a Zod `preprocess`
  guards against `""` coercing to `0`).
- **Page-overflow clamps to the last page** instead of showing an empty page.

Additional M4 decisions:

- **Vendored components** via the shadcn CLI (`radix-nova` preset): 16 components copied into
  `src/components/ui/` and owned by this repo — no runtime UI-kit dependency to chase.
- **Sonner instead of raw Radix Toast** for notifications: shadcn's current toast primitive is
  sonner (accessible, announced via live region); one small dependency replaces a hand-rolled
  toast system.
- **Native `<select>`/inputs for storefront filters** (upcoming M5) rather than Radix Select —
  native controls are the right tool for a plain GET filter form.
- The CLI tried to reintroduce Google-font Geist; reverted to keep the offline-build guarantee
  from M0.

Additional M1 decisions:

- **Two databases in one container**: `shopops` (dev) plus `shopops_test`, created by an init
  script in `docker/postgres-init/`. Tests never touch the dev database.
- **DB-level stock guard**: the initial migration adds a raw-SQL
  `CHECK ("stockQuantity" >= 0)` on `Product` — negative inventory is impossible even if
  application-level checks regress.
- **`order_number_seq` sequence** backs human-readable order numbers (`SO-001042`); generated
  in the checkout transaction, not by a column default, because the `SO-` prefix formatting
  lives in application code.

## Decisions made at M0

- **System font stack instead of `next/font/google`.** The create-next-app default (Geist via
  Google Fonts) downloads font files at build time, which breaks fully offline builds and adds a
  network dependency to CI. A system font stack has zero runtime/build-time dependencies and
  looks native on every platform.
- **Light theme only for v1.** Halves the color-contrast surface that must be audited for
  WCAG AA. Dark mode is a documented future improvement.
- **`save-exact=true` in `.npmrc`** so every future `pnpm add` pins exactly by default.

The full architecture rationale (stack selection, rejected technologies, data model, testing
strategy) lives in the other documents in this folder as they are written, milestone by
milestone.
