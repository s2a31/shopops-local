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

const orders = await import("@/app/api/admin/orders/route");
const status = await import("@/app/api/admin/orders/[id]/status/route");
const customers = await import("@/app/api/admin/customers/route");

const BASE = "http://localhost:3100/api/admin";
const GOOD_ORIGIN = process.env.APP_URL!;
const context = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});

function patchRequest(url: string, body: unknown, origin: string | null): Request {
  return new Request(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

let adminId: string;
let customerId: string;
let orderId: string;

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
  const order = await prisma.order.create({
    data: {
      orderNumber: "SO-100001",
      userId: customer.id,
      paymentMethod: "CASH_ON_DELIVERY",
      subtotalCents: 7990,
      shippingCents: 0,
      totalCents: 7990,
      shippingName: "Buyer",
      shippingStreet: "Street 1",
      shippingCity: "City",
      shippingPostalCode: "1234",
      shippingCountry: "Country",
      items: {
        create: {
          productId: product.id,
          productName: "Halo Desk Lamp",
          unitPriceCents: 7990,
          quantity: 1,
          lineTotalCents: 7990,
        },
      },
    },
  });
  orderId = order.id;
});

async function signIn(userId: string): Promise<void> {
  const { token } = await createSession(userId);
  cookieJar.set(SESSION_COOKIE_NAME, token);
}

describe("admin orders and customers API", () => {
  it("enforces authentication, authorization and origin", async () => {
    let response = await orders.GET(new Request(`${BASE}/orders`), context());
    expect(response.status).toBe(401);

    await signIn(customerId);
    response = await orders.GET(new Request(`${BASE}/orders`), context());
    expect(response.status).toBe(403);
    response = await customers.GET(new Request(`${BASE}/customers`), context());
    expect(response.status).toBe(403);

    await signIn(adminId);
    response = await status.PATCH(
      patchRequest(`${BASE}/orders/${orderId}/status`, { status: "PROCESSING" }, null),
      context({ id: orderId }),
    );
    expect(response.status).toBe(403);
  });

  it("lists orders with customer identity and applies a valid transition", async () => {
    await signIn(adminId);

    const list = await orders.GET(new Request(`${BASE}/orders?status=PLACED`), context());
    const page = await list.json();
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      orderNumber: "SO-100001",
      user: { email: "customer@example.com" },
    });

    const patched = await status.PATCH(
      patchRequest(`${BASE}/orders/${orderId}/status`, { status: "PROCESSING" }, GOOD_ORIGIN),
      context({ id: orderId }),
    );
    expect(patched.status).toBe(200);
    const body = await patched.json();
    expect(body.status).toBe("PROCESSING");
  });

  it("maps an invalid transition onto the 409 envelope", async () => {
    await signIn(adminId);
    const response = await status.PATCH(
      patchRequest(`${BASE}/orders/${orderId}/status`, { status: "DELIVERED" }, GOOD_ORIGIN),
      context({ id: orderId }),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("lists customers with aggregates and never exposes password hashes", async () => {
    await signIn(adminId);
    const response = await customers.GET(new Request(`${BASE}/customers`), context());
    expect(response.status).toBe(200);
    const page = await response.json();
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      email: "customer@example.com",
      orderCount: 1,
      totalSpentCents: 7990,
    });
    expect(JSON.stringify(page)).not.toContain("passwordHash");
  });
});
