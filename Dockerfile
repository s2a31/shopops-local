# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22.21.0-bookworm-slim@sha256:f9f7f95dcf1f007b007c4dcd44ea8f7773f931b71dc79d57c216e731c87a090b

FROM ${NODE_IMAGE} AS base

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@10.25.0 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1
# These values only satisfy build-time validation. The standalone server reads
# the real DATABASE_URL and APP_URL from the runtime environment.
ENV DATABASE_URL=postgresql://unused:unused@127.0.0.1:5432/unused
ENV APP_URL=http://localhost:3000

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN --mount=type=cache,target=/app/.next/cache pnpm build \
    && rm -rf .next/standalone/public .next/standalone/.next/static

FROM ${NODE_IMAGE} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
