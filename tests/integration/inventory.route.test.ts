import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { resetDb } from "../helpers/db";

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

const route = await import("@/app/api/admin/inventory/adjustments/route");

const URL_BASE = "http://localhost:3100/api/admin/inventory/adjustments";
const GOOD_ORIGIN = process.env.APP_URL!;
const context = { params: Promise.resolve({}) };

function postRequest(body: unknown, origin: string | null): Request {
  return new Request(URL_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

let adminId: string;
let customerId: string;
let productId: string;

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

  const category = await prisma.category.create({ data: { name: "Home", slug: "home" } });
  const product = await prisma.product.create({
    data: {
      name: "Halo Desk Lamp",
      slug: "halo-desk-lamp",
      description: "Lamp",
      priceCents: 7990,
      stockQuantity: 10,
      categoryId: category.id,
    },
  });
  productId = product.id;
});

async function signIn(userId: string): Promise<void> {
  const { token } = await createSession(userId);
  cookieJar.set(SESSION_COOKIE_NAME, token);
}

describe("admin inventory adjustments API", () => {
  it("enforces authentication, authorization and origin", async () => {
    let response = await route.GET(new Request(URL_BASE), context);
    expect(response.status).toBe(401);

    await signIn(customerId);
    response = await route.GET(new Request(URL_BASE), context);
    expect(response.status).toBe(403);

    await signIn(adminId);
    response = await route.POST(
      postRequest({ productId, delta: 5, reason: "RESTOCK" }, null),
      context,
    );
    expect(response.status).toBe(403);
  });

  it("creates an adjustment and lists it in the audit trail", async () => {
    await signIn(adminId);
    const created = await route.POST(
      postRequest({ productId, delta: 5, reason: "RESTOCK", note: "supplier drop" }, GOOD_ORIGIN),
      context,
    );
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.stockQuantity).toBe(15);

    const list = await route.GET(new Request(`${URL_BASE}?productId=${productId}`), context);
    const page = await list.json();
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ delta: 5, reason: "RESTOCK", note: "supplier drop" });
  });

  it("maps a would-go-negative adjustment onto the 409 envelope", async () => {
    await signIn(adminId);
    const response = await route.POST(
      postRequest({ productId, delta: -11, reason: "MANUAL_CORRECTION" }, GOOD_ORIGIN),
      context,
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.details).toMatchObject({ stockQuantity: 10 });
  });

  it("rejects a zero delta with a validation error", async () => {
    await signIn(adminId);
    const response = await route.POST(
      postRequest({ productId, delta: 0, reason: "RESTOCK" }, GOOD_ORIGIN),
      context,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
