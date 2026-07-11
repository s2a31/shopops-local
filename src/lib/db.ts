import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

// Reuse one client across dev hot-reloads; Next.js re-evaluates modules on
// every change and would otherwise exhaust the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
