import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db";

import { POST } from "@/app/api/checkout/route";

import { resetDb } from "../helpers/db";

/**
 * Handler-level coverage for POST /api/checkout: origin enforcement, auth
 * boundaries, and the error envelope. `next/headers` cookies need a request
 * scope that a direct handler call does not provide, so a tiny in-memory jar
 * stands in; real wire-level cookie tests arrive with the M14 api project.
 */

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => void cookieJar.set(name, value),
  }),
}));

// getCurrentUser memoizes with React cache per request scope; without a scope
// it must not leak results across tests, so cache becomes a pass-through.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T): T => fn,
}));

const ROUTE_URL = "http://localhost:3100/api/checkout";
const context = { params: Promise.resolve({}) };

function requestWith(origin: string | null, body: unknown): Request {
  return new Request(ROUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

const ADDRESS = {
  name: "Ada Lovelace",
  street: "1 Analytical Row",
  city: "Dublin",
  postalCode: "D01 F5P2",
  country: "Ireland",
};

let userId: string;
let productId: string;

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();

  const user = await prisma.user.create({
    data: { email: "buyer@example.com", passwordHash: "irrelevant-here", name: "Buyer" },
  });
  userId = user.id;

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

async function signIn(): Promise<void> {
  const { token } = await createSession(userId);
  cookieJar.set(SESSION_COOKIE_NAME, token);
}

const validBody = () => ({
  items: [{ productId, quantity: 1 }],
  shippingAddress: ADDRESS,
  paymentMethod: "CASH_ON_DELIVERY",
});

describe("POST /api/checkout", () => {
  it("rejects a missing Origin header with 403 before anything else", async () => {
    await signIn();
    const response = await POST(requestWith(null, validBody()), context);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects a mismatched Origin with 403", async () => {
    await signIn();
    const response = await POST(requestWith("http://evil.example", validBody()), context);
    expect(response.status).toBe(403);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const response = await POST(requestWith(process.env.APP_URL!, validBody()), context);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(await prisma.order.count()).toBe(0);
  });

  it("places an order for a signed-in customer and returns 201", async () => {
    await signIn();
    const response = await POST(requestWith(process.env.APP_URL!, validBody()), context);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.orderNumber).toMatch(/^SO-\d{6}$/);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: body.orderId } });
    expect(order.userId).toBe(userId);
  });

  it("maps a declined simulated payment to a 402 envelope with no order", async () => {
    await signIn();
    const response = await POST(
      requestWith(process.env.APP_URL!, {
        ...validBody(),
        paymentMethod: "SIMULATED_CARD",
        simulatedOutcome: "DECLINE",
      }),
      context,
    );
    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.error.code).toBe("PAYMENT_DECLINED");
    expect(await prisma.order.count()).toBe(0);
  });

  it("maps insufficient stock to a 409 envelope with per-line details", async () => {
    await signIn();
    const response = await POST(
      requestWith(process.env.APP_URL!, {
        ...validBody(),
        items: [{ productId, quantity: 9 }],
      }),
      context,
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(body.error.details.lines[0]).toMatchObject({
      productId,
      problem: "INSUFFICIENT_STOCK",
      availableQuantity: 5,
    });
  });

  it("returns the validation envelope for malformed bodies", async () => {
    await signIn();
    const response = await POST(
      requestWith(process.env.APP_URL!, { ...validBody(), items: [] }),
      context,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
