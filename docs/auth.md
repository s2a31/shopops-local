# Authentication and authorization

Hand-rolled, database-backed cookie sessions — no Auth.js/Lucia dependency. External providers
are out of scope for this project, and the mechanics are the point of a learning repo. The
entire surface is ~200 lines in `src/lib/auth/`.

## Passwords

Argon2id via `@node-rs/argon2` with OWASP-recommended parameters (19 MiB memory, t=2, p=1).
Hashes are generated at registration/seed time; no plaintext or hash ever leaves the service
layer.

## Sessions

- **Issue**: 32 random bytes → base64url token in the `shopops_session` cookie; the database
  stores only the **SHA-256 hash** (`Session.tokenHash`), so a leaked database contains no
  usable credentials. Cookie flags: `httpOnly`, `SameSite=Lax`, `Secure` in production,
  `Path=/`.
- **Lifetime**: 30 days, with sliding renewal whenever less than 15 days remain.
- **Validation**: hash the incoming token → look up with the user join → reject missing or
  expired rows (deleting the row and clearing the cookie). Missing, invalid, and expired
  sessions all resolve to plain guest — indistinguishable by design.
- **Logout** deletes the session row (server-side invalidation), not just the cookie.
- **Fixation**: a fresh session is created on every login and registration.

## CSRF

Defense in depth, JSON-only APIs, no form-POST endpoints:

1. `SameSite=Lax` cookies as the first layer.
2. **Mandatory Origin-header validation** on every state-changing request (`POST`, `PUT`,
   `PATCH`, `DELETE`): the `Origin` header must exactly equal the configured `APP_URL`,
   enforced centrally in the `apiRoute()` wrapper before any body parsing. Missing or
   mismatched origins get `403 FORBIDDEN`. There is no production bypass; tests send the
   correct header explicitly.

## Authorization

- Roles: `GUEST` (no session), `CUSTOMER`, `ADMIN` — admin is a strict superset for
  storefront actions. Every check is server-side; the client never decides authorization.
- `getCurrentUser()` (React-cached per request) → `requireUser()` (throws 401) →
  `requireAdmin()` (throws 403). Protected layouts redirect guests to `/login?next=…`;
  guarded pages null-check the user themselves because layouts and pages render in parallel.
- `proxy.ts` only does optimistic cookie-presence redirects (UX, not security — it never
  touches the database).
- `role` lives only in the database, is never accepted from any request body, and admin
  accounts exist only via the seed — cookies, localStorage, or devtools tampering cannot
  elevate privileges because every decision re-reads the database session.
- Another user's order id returns **404, not 403**, so order-id existence leaks nothing.

## Login rate limiting

A small in-process fixed-window counter (per email + IP) returns `429 RATE_LIMITED` on abuse.
State lives in process memory, so it resets on restart and is per-instance — appropriate for
this local single-process app and recorded in `docs/limitations.md`.
