# Known limitations

ShopOps Local is a **learning and reference project**, not a production shop. These gaps are
deliberate scope decisions (approved before implementation), not oversights.

## Excluded from version 1

- **Password reset / change and email verification** — the project allows no email provider;
  losing a demo password means reseeding.
- **Guest checkout** — login is required, halving checkout branching.
- **Address book** — checkout prefills from the most recent order instead.
- **Product reviews, ratings, wishlists.**
- **Coupons, discounts, taxes / VAT breakdown** — pricing is flat shipping only.
- **Multi-currency and i18n** — EUR and English only.
- **Image upload** — products pick from locally generated, committed artwork; no upload
  subsystem, storage service, or licensing uncertainty.
- **Admin user management UI** — admins exist only via the seed.
- **Category delete** — create/edit only (delete has restrict-vs-orphan complexity).
- **Cross-device cart sync** — the cart is per-browser (localStorage).

## Simplifications to know about

- **Payments are simulated.** There is no PSP integration and, by design, **no card-number
  field anywhere** — payment scenarios are radio buttons. `REFUNDED` is a flag, not a money
  flow.
- **The login rate limiter is in-process** (fixed window per email + IP): it resets on
  restart and would not survive multiple instances. Fine for a local single-process app.
- **Sessions are checked against Postgres on every request** — at this scale a session cache
  (e.g. Redis) is deliberately absent.
- **Search is Postgres `ILIKE`** over a ~40-product catalogue; `pg_trgm` or a search engine
  would be the upgrade path.
- **Streaming page 404s return HTTP 200**: `loading.tsx` boundaries send headers before
  `notFound()` resolves, so foreign/unknown ids are answered by the rendered 404 page, while
  API routes return real 404 status codes.
- **No production deployment story**: no Dockerfile for the app (optional post-v1), no
  monitoring, no rate limiting beyond login. The dev loop is one `next dev` plus one Postgres
  container by design.
- **Demo credentials are public on purpose** (`admin@shopops.local` / `DemoAdmin123!` etc.) —
  they are seeded fixtures on your machine, not secrets.
