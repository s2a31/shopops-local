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

Versions for later-milestone dependencies (Prisma, Zod, TanStack Query, Zustand, RHF, Radix,
Vitest, Playwright, `@node-rs/argon2`, …) are pinned in the milestone that introduces them and
recorded here at that time.

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
