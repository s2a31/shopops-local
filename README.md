# ShopOps Local

A locally runnable e-commerce storefront and administration system, built as a **technical
learning and reference project**. It demonstrates how a modern React / TypeScript / Next.js /
PostgreSQL application is structured, implemented, tested, and documented — as a polished,
reasonably lean modular monolith.

> **Status: under construction.** The project is being built in incremental milestones; this
> README will grow with each one. See `docs/decisions.md` for the pinned technology versions.

## Requirements

- Node.js 22 (arm64-native on Apple Silicon)
- pnpm 10
- Docker Desktop (used only for PostgreSQL)

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:3000. Database setup, seed data, and demo credentials will be
documented here as those milestones land.

## Commands

| Command             | Purpose                      |
| ------------------- | ---------------------------- |
| `pnpm dev`          | Start the development server |
| `pnpm build`        | Production build             |
| `pnpm start`        | Serve the production build   |
| `pnpm lint`         | ESLint                       |
| `pnpm format`       | Format with Prettier         |
| `pnpm format:check` | Verify formatting            |
| `pnpm typecheck`    | TypeScript type-check        |

## AI-generated project disclosure

This application was created with substantial AI assistance (Claude) and is used as a learning
and reference project. It is not a production shop and must not be treated as one.
