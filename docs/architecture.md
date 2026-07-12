# Architecture

ShopOps Local is a **modular monolith**: one Next.js (App Router) process on the host plus one
PostgreSQL container. Everything essential runs offline after `pnpm install` and a single image
pull — no paid services, cloud accounts, or API keys.

## Layering

```
Pages (RSC) ──────────────┐
                          ├──▶ src/server/services/*  ──▶ Prisma ──▶ PostgreSQL
Route handlers (app/api) ─┘
```

- **Route handlers** (`src/app/api/**`) contain HTTP concerns only: parse → Zod validate →
  auth guard → call a service → map the result or `AppError` onto the response. Every handler
  is wrapped by `apiRoute()` (`src/lib/api.ts`), which enforces Origin validation on mutating
  methods and maps thrown errors onto the JSON envelope — neither can be forgotten.
- **Services** (`src/server/services/*.ts`) own domain rules and transactions. Pages call them
  directly (no HTTP hop); route handlers expose them over REST. Pages and handlers never
  contain business logic.
- **Prisma** is the only database access path. `passwordHash` never crosses the service
  boundary: services select explicit field lists.

## Server vs client components

- **Server (default)**: catalogue pages (read `searchParams`, call services directly), product
  detail, account order pages, all layouts including session reads and guards.
- **Client islands**: header cart badge + drawer, add-to-cart, cart page, all forms
  (React Hook Form), filter toolbar (writes URL params), admin data tables, dialogs.

## State ownership

| Kind                          | Where                              | Why                                                                                                                    |
| ----------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Server state, server-rendered | RSC + direct service calls         | Catalogue, product detail, customer orders; refreshed via `router.refresh()` after mutations                           |
| Server state, client-managed  | TanStack Query                     | Admin tables (filter/paginate/mutate without navigation), cart validation query, checkout + cancel mutations           |
| Client-only state             | Zustand (`persist` → localStorage) | The cart: `{ productId, quantity }[]` plus drawer/nav-open flags — it exists before login and belongs to the browser   |
| Auth state                    | Server-first                       | Layouts read the session per request; `GET /api/auth/session` exists for the rare client component that needs the user |

Prices and stock are **never** stored client-side. The cart store holds only ids and
quantities; `POST /api/cart/validate` returns canonical names, prices, stock, and per-line
issues on every change, so a stale-price conflict is structurally impossible.

## Feature modules

`src/features/<name>/` owns the components, hooks, and Zod schemas of one domain slice
(catalog, cart, checkout, orders, auth, admin/*). `src/components/ui` holds the vendored
shadcn/Radix primitives; `src/lib` holds cross-cutting helpers (db, auth, money, errors,
api-client, logger).

## Request guards

- `proxy.ts` (Next 16's renamed middleware) does **optimistic cookie-presence redirects** only
  for `/account`, `/checkout`, `/admin` — a UX nicety, not security.
- Real authorization happens server-side in layouts and in every protected handler via
  `getCurrentUser()` / `requireUser()` / `requireAdmin()` (`src/lib/auth/guards.ts`), each of
  which validates the session against the database.
- Layouts and pages render **in parallel** in the App Router, so guarded pages null-check the
  user themselves — a layout redirect does not stop the page render.

## Money

All amounts are **integer cents** (EUR) end-to-end; division happens only at display time in
`formatMoney()` (`Intl.NumberFormat`, `en-IE`/EUR). Shipping is a flat 499 cents, free from a
5 000-cent subtotal. Totals are computed from database prices only — client-sent prices are
never trusted.

## Error handling

Services throw `AppError` (`code`, `httpStatus`, `message`, `details?`). The API layer maps it
onto `{ error: { code, message, details? } }`; Zod errors become `VALIDATION_ERROR` with
flattened field errors; anything unexpected is logged and returned as a generic 500. On the
client, the typed `apiClient` throws `ApiError`; forms map validation details onto field
errors, business errors (402/409) render inline, transport failures toast. Empty, error, and
loading are distinct designed states for every list surface.
