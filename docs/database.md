# Database model

Eight tables, five enums (`prisma/schema.prisma`). IDs are cuid strings; every table has
`createdAt` (plus `updatedAt` where rows mutate). There are deliberately **no Cart/CartItem
tables** (the cart is client-owned, revalidated server-side), **no Address table** (the
shipping address is snapshotted onto the order), and **no Payment table** (payment fields live
1:1 on `Order`; declined simulations never create an order, so there is no attempt history to
model).

## Enums

| Enum              | Values                                                                             |
| ----------------- | ---------------------------------------------------------------------------------- |
| `Role`            | `CUSTOMER`, `ADMIN`                                                                |
| `OrderStatus`     | `PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`                        |
| `PaymentMethod`   | `CASH_ON_DELIVERY`, `SIMULATED_CARD`                                               |
| `PaymentStatus`   | `PENDING`, `PAID`, `REFUNDED`                                                      |
| `InventoryReason` | `INITIAL_STOCK`, `RESTOCK`, `MANUAL_CORRECTION`, `ORDER_PLACED`, `ORDER_CANCELLED` |

## Tables

| Model                 | Purpose and rules                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`                | Account + role. `email` unique, stored lowercase; `passwordHash` (Argon2id) never crosses the service boundary; `role` defaults to `CUSTOMER` and is set only by the seed. No deletion in v1 (orders reference users with `Restrict`).                                                                                                                                                                     |
| `Session`             | Server-side session. `tokenHash` unique — the SHA-256 of the random cookie token, so a database leak exposes no usable credentials. Cascade-deleted with the user; expired rows removed opportunistically on validation.                                                                                                                                                                                   |
| `Category`            | `name` and `slug` unique; products FK `Restrict` (no category delete in v1).                                                                                                                                                                                                                                                                                                                               |
| `Product`             | `slug` unique; `priceCents` int > 0; `stockQuantity` guarded by a raw-SQL `CHECK ("stockQuantity" >= 0)` in the initial migration — negative inventory is impossible even if application checks regress. `lowStockThreshold` (default 5) drives low-stock states. Never hard-deleted once ordered (`OrderItem` FK `Restrict`) — deactivate instead. Currency is an app-level constant (EUR), not a column. |
| `ProductImage`        | Local image paths under `/images/products/`; `altText` required (a11y); unique `(productId, sortOrder)`.                                                                                                                                                                                                                                                                                                   |
| `Order`               | `orderNumber` unique, human-readable `SO-000123` from the `order_number_seq` Postgres sequence (formatted in application code inside the checkout transaction). Payment fields (`paymentMethod`, `paymentStatus`, `paymentRef?`) and the full shipping snapshot live on the row. Totals are stored, not recomputed. Never deleted.                                                                         |
| `OrderItem`           | Line item with historical snapshots: `productName` and `unitPriceCents` are copies taken at purchase time. Unique `(orderId, productId)`; `productId` FK `Restrict`.                                                                                                                                                                                                                                       |
| `InventoryAdjustment` | Append-only stock audit: `delta` (≠ 0), `reason`, optional `orderId`/`actorUserId` (SetNull), never updated or deleted. Every stock change from any source leaves a row, so a product's `stockQuantity` always equals the sum of its deltas (asserted by an integration test).                                                                                                                             |

## Historical correctness

Order rows copy the product name, unit price, and shipping address at purchase time; later
renames, price changes, or deactivation cannot alter past orders, and `Restrict` FKs make
hard-deleting a referenced product or user impossible at the database level.

## Databases and lifecycle

The one Postgres container hosts two databases: `shopops` (development) and `shopops_test`
(created by `docker/postgres-init/01-create-test-db.sql`; used by integration tests and
Playwright). Lifecycle scripts: `db:up`, `db:down`, `db:destroy`, `db:migrate`, `db:seed`,
`db:reset`, `db:studio`, `db:test:reset` — see the README command table.

## Seed

`prisma/seed.ts` is idempotent (upserts by unique keys) and profile-aware via `SEED_PROFILE`
(`dev` default, `e2e` pins the fixture product to exactly one unit of stock). It creates the
demo accounts, 6 categories, ~36 products with locally generated images, fixture orders for
the demo customer, and matching `INITIAL_STOCK`/order adjustments so the sum-of-deltas
invariant holds from day one.
