import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { resetDb } from "../helpers/db";

/**
 * Authorization boundaries of the admin API: no session → 401, customer
 * session → 403, admin session → 200. Same next/headers and React-cache
 * stand-ins as the other route suites.
 */

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => void cookieJar.set(name, value),
  }),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T): T => fn,
}));

const { GET: getDashboard } = await import("@/app/api/admin/dashboard/route");

let adminId: string;
let customerId: string;

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: "irrelevant-here",
      name: "Admin",
      role: "ADMIN",
    },
  });
  const customer = await prisma.user.create({
    data: { email: "customer@example.com", passwordHash: "irrelevant-here", name: "Customer" },
  });
  adminId = admin.id;
  customerId = customer.id;
});

async function signIn(userId: string): Promise<void> {
  const { token } = await createSession(userId);
  cookieJar.set(SESSION_COOKIE_NAME, token);
}

const request = () => new Request("http://localhost:3100/api/admin/dashboard");
const context = { params: Promise.resolve({}) };

describe("GET /api/admin/dashboard", () => {
  it("returns 401 without a session", async () => {
    const response = await getDashboard(request(), context);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 for a signed-in customer", async () => {
    await signIn(customerId);
    const response = await getDashboard(request(), context);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns the summary shape for an admin", async () => {
    await signIn(adminId);
    const response = await getDashboard(request(), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      revenue30dCents: 0,
      ordersByStatus: { PLACED: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 },
      lowStock: [],
      topProducts: [],
    });
  });
});
