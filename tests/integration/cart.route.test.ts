import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { POST } from "@/app/api/cart/validate/route";

import { resetDb } from "../helpers/db";

/**
 * Origin-enforcement coverage for the cart endpoint. Full wire-level HTTP
 * tests (cookies, real fetch) arrive with the M14 api project; here we invoke
 * the handler directly, which still exercises the apiRoute wrapper.
 */

const ROUTE_URL = "http://localhost:3100/api/cart/validate";
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

let productId: string;

beforeEach(async () => {
  await resetDb();
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

describe("POST /api/cart/validate", () => {
  const validBody = () => ({ items: [{ productId, quantity: 1 }] });

  it("rejects a missing Origin header with 403", async () => {
    const response = await POST(requestWith(null, validBody()), context);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects a mismatched Origin with 403", async () => {
    const response = await POST(requestWith("http://evil.example", validBody()), context);
    expect(response.status).toBe(403);
  });

  it("accepts the configured APP_URL origin and returns canonical data", async () => {
    const response = await POST(requestWith(process.env.APP_URL!, validBody()), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.purchasable).toBe(true);
    expect(body.lines[0].product.priceCents).toBe(8990);
  });

  it("returns the validation envelope for malformed bodies", async () => {
    const response = await POST(
      requestWith(process.env.APP_URL!, { items: [{ productId, quantity: 0 }] }),
      context,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
