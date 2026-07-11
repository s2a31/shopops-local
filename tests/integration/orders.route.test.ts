import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import type { CheckoutInput } from "@/features/checkout/schemas";
import { placeOrder } from "@/server/services/checkout.service";

import { resetDb } from "../helpers/db";

/**
 * Handler-level coverage for the customer order endpoints. Same stand-ins as
 * checkout.route.test.ts: an in-memory cookie jar for next/headers and a
 * pass-through React cache (no request scope in a direct handler call).
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

// Imported after the mocks so the guard chain picks them up.
const { GET: listOrders } = await import("@/app/api/orders/route");
const { GET: getOrder } = await import("@/app/api/orders/[id]/route");
const { POST: cancelOrder } = await import("@/app/api/orders/[id]/cancel/route");

const ADDRESS = {
  name: "Ada Lovelace",
  phone: undefined,
  street: "1 Analytical Row",
  city: "Dublin",
  postalCode: "D01 F5P2",
  country: "Ireland",
};

let buyerId: string;
let otherId: string;
let productId: string;

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();

  const buyer = await prisma.user.create({
    data: { email: "buyer@example.com", passwordHash: "irrelevant-here", name: "Buyer" },
  });
  const other = await prisma.user.create({
    data: { email: "other@example.com", passwordHash: "irrelevant-here", name: "Other" },
  });
  buyerId = buyer.id;
  otherId = other.id;

  const category = await prisma.category.create({ data: { name: "Audio", slug: "audio" } });
  const product = await prisma.product.create({
    data: {
      name: "Reverb Mini Speaker",
      slug: "reverb-mini-speaker",
      description: "Speaker",
      priceCents: 8990,
      stockQuantity: 5,
      categoryId: category.id,
    },
  });
  productId = product.id;
});

async function signIn(userId: string): Promise<void> {
  const { token } = await createSession(userId);
  cookieJar.set(SESSION_COOKIE_NAME, token);
}

function placeFixtureOrder(userId: string) {
  const input: CheckoutInput = {
    items: [{ productId, quantity: 1 }],
    shippingAddress: ADDRESS,
    paymentMethod: "CASH_ON_DELIVERY",
  };
  return placeOrder(userId, input);
}

const getRequest = (url: string) => new Request(url, { method: "GET" });
const postRequest = (url: string, origin: string | null) =>
  new Request(url, {
    method: "POST",
    headers: origin ? { Origin: origin } : {},
  });
const contextFor = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/orders", () => {
  it("requires a session", async () => {
    const response = await listOrders(getRequest("http://localhost:3100/api/orders"), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(401);
  });

  it("returns only the caller's orders, paginated", async () => {
    await placeFixtureOrder(buyerId);
    await placeFixtureOrder(otherId);
    await signIn(buyerId);

    const response = await listOrders(getRequest("http://localhost:3100/api/orders?page=1"), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].itemCount).toBe(1);
  });
});

describe("GET /api/orders/[id]", () => {
  it("returns the order to its owner", async () => {
    const placed = await placeFixtureOrder(buyerId);
    await signIn(buyerId);

    const response = await getOrder(
      getRequest(`http://localhost:3100/api/orders/${placed.orderId}`),
      contextFor(placed.orderId),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orderNumber).toBe(placed.orderNumber);
  });

  it("404s for another user's order without leaking its existence", async () => {
    const placed = await placeFixtureOrder(buyerId);
    await signIn(otherId);

    const response = await getOrder(
      getRequest(`http://localhost:3100/api/orders/${placed.orderId}`),
      contextFor(placed.orderId),
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/orders/[id]/cancel", () => {
  it("rejects a missing Origin header with 403", async () => {
    const placed = await placeFixtureOrder(buyerId);
    await signIn(buyerId);

    const response = await cancelOrder(
      postRequest(`http://localhost:3100/api/orders/${placed.orderId}/cancel`, null),
      contextFor(placed.orderId),
    );
    expect(response.status).toBe(403);
  });

  it("requires a session", async () => {
    const placed = await placeFixtureOrder(buyerId);
    const response = await cancelOrder(
      postRequest(
        `http://localhost:3100/api/orders/${placed.orderId}/cancel`,
        process.env.APP_URL!,
      ),
      contextFor(placed.orderId),
    );
    expect(response.status).toBe(401);
  });

  it("cancels the owner's PLACED order and restores stock", async () => {
    const placed = await placeFixtureOrder(buyerId);
    await signIn(buyerId);

    const response = await cancelOrder(
      postRequest(
        `http://localhost:3100/api/orders/${placed.orderId}/cancel`,
        process.env.APP_URL!,
      ),
      contextFor(placed.orderId),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("CANCELLED");

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stockQuantity).toBe(5);
  });

  it("maps a repeat cancellation to the CONFLICT envelope", async () => {
    const placed = await placeFixtureOrder(buyerId);
    await signIn(buyerId);
    const url = `http://localhost:3100/api/orders/${placed.orderId}/cancel`;

    await cancelOrder(postRequest(url, process.env.APP_URL!), contextFor(placed.orderId));
    const second = await cancelOrder(
      postRequest(url, process.env.APP_URL!),
      contextFor(placed.orderId),
    );
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe("CONFLICT");
  });
});
