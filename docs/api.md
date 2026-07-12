# REST API

All endpoints live under `src/app/api/` as Next.js Route Handlers. Every handler is wrapped by
`apiRoute()` — Origin validation on mutating methods plus error mapping — and validates its
input with the same Zod schema the corresponding form uses.

## Error envelope

Every non-2xx response has the shape:

```json
{ "error": { "code": "…", "message": "…", "details": … } }
```

| Code                 | HTTP status |
| -------------------- | ----------- |
| `VALIDATION_ERROR`   | 400         |
| `UNAUTHORIZED`       | 401         |
| `PAYMENT_DECLINED`   | 402         |
| `FORBIDDEN`          | 403         |
| `NOT_FOUND`          | 404         |
| `CONFLICT`           | 409         |
| `INSUFFICIENT_STOCK` | 409         |
| `RATE_LIMITED`       | 429         |
| `INTERNAL`           | 500         |

Auth legend: 🌐 public · 👤 session required · 🛡 admin required. Non-admin sessions on 🛡
routes get 403; no session gets 401.

## Auth

| Endpoint                  | Auth | Notes                                                                                            | Failures                  |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------ | ------------------------- |
| `POST /api/auth/register` | 🌐   | `{email, password, name}`; email lowercased; auto-login → 201 `{user}` + cookie                  | 400; 409 email taken; 429 |
| `POST /api/auth/login`    | 🌐   | `{email, password}`; uniform "invalid credentials" (no user enumeration) → 200 `{user}` + cookie | 400; 401; 429             |
| `POST /api/auth/logout`   | 👤   | deletes the session row, clears the cookie → 204                                                 | 401                       |
| `GET /api/auth/session`   | 🌐   | client hydration helper → 200 `{user \| null}`                                                   | —                         |

## Catalogue

| Endpoint                   | Auth | Notes                                                                                                          |
| -------------------------- | ---- | -------------------------------------------------------------------------------------------------------------- |
| `GET /api/products`        | 🌐   | query `q, category, minPrice, maxPrice, sort(newest\|price-asc\|price-desc\|name), page`; active products only |
| `GET /api/products/[slug]` | 🌐   | active only → 200 `{product}` (with images); 404 otherwise                                                     |
| `GET /api/categories`      | 🌐   | with active-product counts                                                                                     |

## Cart

| Endpoint                  | Auth | Notes                                                                                                                                               |
| ------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/cart/validate` | 🌐   | `{items: [{productId, quantity}]}` (≤ 50 lines) → canonical lines with fresh names/prices/stock, per-line `issue`, totals, and a `purchasable` flag |

## Checkout and customer orders

| Endpoint                       | Auth | Notes                                                                                                                                      | Failures                                                                                                            |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `POST /api/checkout`           | 👤   | `{items, shippingAddress, paymentMethod, simulatedOutcome?}`; totals computed from **database prices only** → 201 `{orderId, orderNumber}` | 400; 401; 402 declined (no order, no stock change); 409 insufficient stock / inactive product with per-line details |
| `GET /api/orders?page=`        | 👤   | own orders only                                                                                                                            | 401                                                                                                                 |
| `GET /api/orders/[id]`         | 👤   | owner only — other ids are 404 (existence not leaked)                                                                                      | 401; 404                                                                                                            |
| `POST /api/orders/[id]/cancel` | 👤   | owner; only `PLACED` orders → restores stock, flags card payments `REFUNDED`                                                               | 401; 404; 409 not cancellable                                                                                       |

## Admin (all 🛡)

| Endpoint                                                                | Notes                                                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/products`                                               | query `q, status(active\|inactive\|all), category, lowStock, page`; includes inactive                      |
| `POST /api/admin/products`                                              | create; initial stock logs an `INITIAL_STOCK` adjustment; 409 on slug duplicate                            |
| `GET \| PATCH /api/admin/products/[id]`                                 | partial update; price/name edits never touch past orders (snapshots)                                       |
| `GET \| POST /api/admin/categories`, `PATCH /api/admin/categories/[id]` | 409 on name/slug duplicate                                                                                 |
| `POST /api/admin/inventory/adjustments`                                 | `{productId, delta ≠ 0, reason(RESTOCK\|MANUAL_CORRECTION), note?}`; 409 if the result would go below zero |
| `GET /api/admin/inventory/adjustments?productId&page`                   | append-only audit trail                                                                                    |
| `GET /api/admin/orders`                                                 | query `status, q (order number / email), page`                                                             |
| `GET /api/admin/orders/[id]` · `PATCH /api/admin/orders/[id]/status`    | `{status}` validated against the transition table; 409 on an illegal move                                  |
| `GET /api/admin/customers?q&page`                                       | id, name, email, createdAt, orderCount, totalSpentCents — never password hashes                            |
| `GET /api/admin/dashboard`                                              | `{revenue30dCents, ordersByStatus, lowStock[], topProducts[]}`                                             |

## Business rules enforced behind the API

- **Order status machine** (`src/features/orders/transitions.ts`, used by both server
  validation and the admin UI): `PLACED → PROCESSING | CANCELLED`,
  `PROCESSING → SHIPPED | CANCELLED (admin)`, `SHIPPED → DELIVERED`; `DELIVERED` and
  `CANCELLED` are terminal. Anything else is a 409.
- **Checkout transaction**: lines are sorted by `productId` and decremented in that
  deterministic order (consistent lock ordering) with a conditional
  `UPDATE … SET "stockQuantity" = "stockQuantity" - qty WHERE id = ? AND "stockQuantity" >= qty`;
  zero affected rows rolls the whole transaction back with per-line availability. Two
  concurrent checkouts for the last unit: one succeeds, one gets 409 — no negative stock.
- **Payments**: COD → order `PLACED`/payment `PENDING` (auto-`PAID` when marked
  `DELIVERED`). Simulated card resolves before any write: `APPROVE` → `PAID` with a fake
  `SIM-…` reference; `DECLINE` → 402 with no order and the cart intact. No card-number field
  exists anywhere.
- **Money**: `lineTotal = unitPriceCents × quantity`; shipping 499 cents, free at ≥ 5 000;
  all integers.
