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
