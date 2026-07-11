import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { resetDb } from "../helpers/db";

/**
 * Wire-level behavior of the admin catalogue API: authorization boundaries,
 * origin enforcement on mutations, the error envelope for validation and
 * conflicts, and the rename-keeps-slug rule over HTTP.
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

const products = await import("@/app/api/admin/products/route");
const productById = await import("@/app/api/admin/products/[id]/route");
const categories = await import("@/app/api/admin/categories/route");
const categoryById = await import("@/app/api/admin/categories/[id]/route");

const BASE = "http://localhost:3100/api/admin";
const GOOD_ORIGIN = process.env.APP_URL!;

function jsonRequest(url: string, method: string, body: unknown, origin: string | null): Request {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

const context = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});

let adminId: string;
let customerId: string;
let categoryId: string;

const validProductBody = (overrides: Record<string, unknown> = {}) => ({
  name: "Halo Desk Lamp",
  description: "A lamp.",
  priceCents: 7990,
  categoryId,
  images: [{ url: "/images/products/halo-desk-lamp.svg", altText: "A desk lamp" }],
  isActive: true,
  lowStockThreshold: 5,
  initialStock: 10,
  ...overrides,
});

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
  categoryId = category.id;
});

async function signIn(userId: string): Promise<void> {
  const { token } = await createSession(userId);
  cookieJar.set(SESSION_COOKIE_NAME, token);
}

describe("authorization boundaries", () => {
  it("returns 401 without a session and 403 for customers", async () => {
    let response = await products.GET(new Request(`${BASE}/products`), context());
    expect(response.status).toBe(401);

    await signIn(customerId);
    response = await products.GET(new Request(`${BASE}/products`), context());
    expect(response.status).toBe(403);

    response = await categories.GET(new Request(`${BASE}/categories`), context());
    expect(response.status).toBe(403);
  });

  it("rejects an admin mutation without a matching Origin header", async () => {
    await signIn(adminId);
    const response = await products.POST(
      jsonRequest(`${BASE}/products`, "POST", validProductBody(), null),
      context(),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("admin products API", () => {
  it("creates a product and lists it including when inactive", async () => {
    await signIn(adminId);
    const created = await products.POST(
      jsonRequest(`${BASE}/products`, "POST", validProductBody({ isActive: false }), GOOD_ORIGIN),
      context(),
    );
    expect(created.status).toBe(201);
    const product = await created.json();
    expect(product.slug).toBe("halo-desk-lamp");

    const list = await products.GET(new Request(`${BASE}/products?status=inactive`), context());
    const page = await list.json();
    expect(page.total).toBe(1);
    expect(page.items[0].name).toBe("Halo Desk Lamp");
  });

  it("maps validation failures onto the 400 envelope", async () => {
    await signIn(adminId);
    const response = await products.POST(
      jsonRequest(
        `${BASE}/products`,
        "POST",
        validProductBody({
          priceCents: -5,
          images: [{ url: "https://evil.example/x.png", altText: "x" }],
        }),
        GOOD_ORIGIN,
      ),
      context(),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for a duplicate slug", async () => {
    await signIn(adminId);
    await products.POST(
      jsonRequest(`${BASE}/products`, "POST", validProductBody(), GOOD_ORIGIN),
      context(),
    );
    const response = await products.POST(
      jsonRequest(`${BASE}/products`, "POST", validProductBody(), GOOD_ORIGIN),
      context(),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("keeps the slug on rename over HTTP and 404s on unknown ids", async () => {
    await signIn(adminId);
    const created = await products.POST(
      jsonRequest(`${BASE}/products`, "POST", validProductBody(), GOOD_ORIGIN),
      context(),
    );
    const product = await created.json();

    const patched = await productById.PATCH(
      jsonRequest(`${BASE}/products/${product.id}`, "PATCH", { name: "New Name" }, GOOD_ORIGIN),
      context({ id: product.id }),
    );
    expect(patched.status).toBe(200);
    const updated = await patched.json();
    expect(updated.name).toBe("New Name");
    expect(updated.slug).toBe("halo-desk-lamp");

    const missing = await productById.GET(
      new Request(`${BASE}/products/nope`),
      context({ id: "nope" }),
    );
    expect(missing.status).toBe(404);
  });
});

describe("admin categories API", () => {
  it("creates, lists and updates categories with conflict handling", async () => {
    await signIn(adminId);

    const created = await categories.POST(
      jsonRequest(`${BASE}/categories`, "POST", { name: "Lighting" }, GOOD_ORIGIN),
      context(),
    );
    expect(created.status).toBe(201);
    const category = await created.json();
    expect(category.slug).toBe("lighting");

    const list = await categories.GET(new Request(`${BASE}/categories`), context());
    const all = await list.json();
    expect(all.map((c: { name: string }) => c.name)).toEqual(["Home", "Lighting"]);

    const patched = await categoryById.PATCH(
      jsonRequest(`${BASE}/categories/${category.id}`, "PATCH", { name: "Lights" }, GOOD_ORIGIN),
      context({ id: category.id }),
    );
    expect(patched.status).toBe(200);
    const updated = await patched.json();
    expect(updated).toMatchObject({ name: "Lights", slug: "lighting" });

    const duplicate = await categories.POST(
      jsonRequest(`${BASE}/categories`, "POST", { name: "Home" }, GOOD_ORIGIN),
      context(),
    );
    expect(duplicate.status).toBe(409);
  });
});
