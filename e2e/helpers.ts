import { expect, type Page } from "@playwright/test";

/** Demo accounts created by the seed (documented in the README, local only). */
export const DEMO_ADMIN = { email: "admin@shopops.local", password: "DemoAdmin123!" };
export const DEMO_CUSTOMER = { email: "customer@shopops.local", password: "DemoCustomer123!" };

/** The e2e seed profile pins this product to exactly one unit of stock. */
export const SINGLE_UNIT_PRODUCT = {
  name: "Prism Accent Spotlight",
  slug: "prism-accent-spotlight",
};

export const SHIPPING_ADDRESS = {
  name: "Erzsébet Példa",
  street: "Fő utca 12",
  city: "Budapest",
  postalCode: "1011",
  country: "Hungary",
};

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3100";
}

/**
 * Signs in through the API using the page's request context, so the session
 * cookie lands in the browser context without driving the login form. The
 * explicit Origin header satisfies the same-origin check on state-changing
 * routes. Specs that test the login UI itself drive the form instead.
 */
export async function signIn(
  page: Page,
  account: { email: string; password: string },
): Promise<void> {
  const response = await page.request.post("/api/auth/login", {
    headers: { Origin: appUrl() },
    data: account,
  });
  expect(response.ok(), `login as ${account.email} failed: ${response.status()}`).toBeTruthy();
}

export async function signOut(page: Page): Promise<void> {
  await page.request.post("/api/auth/logout", { headers: { Origin: appUrl() } });
}

/** Registration tests need addresses that never collide across runs. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Opens a product page and adds it to the cart; leaves the drawer open. */
export async function addToCart(page: Page, slug: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
}

/** Fills the checkout shipping form with the fixture address. */
export async function fillShippingAddress(page: Page): Promise<void> {
  await page.getByLabel("Full name").fill(SHIPPING_ADDRESS.name);
  await page.getByLabel("Street address").fill(SHIPPING_ADDRESS.street);
  await page.getByLabel("City").fill(SHIPPING_ADDRESS.city);
  await page.getByLabel("Postal code").fill(SHIPPING_ADDRESS.postalCode);
  await page.getByLabel("Country").fill(SHIPPING_ADDRESS.country);
}

/**
 * Places a Cash on Delivery order through the API as the signed-in user and
 * returns its ids. Used by specs whose subject is what happens *after* an
 * order exists (admin transitions, cancellation) so each run — including CI
 * retries — starts from a fresh, dedicated order.
 */
export async function placeCodOrderViaApi(
  page: Page,
  items: { productId: string; quantity: number }[],
): Promise<{ orderId: string; orderNumber: string }> {
  const response = await page.request.post("/api/checkout", {
    headers: { Origin: appUrl() },
    data: {
      items,
      shippingAddress: SHIPPING_ADDRESS,
      paymentMethod: "CASH_ON_DELIVERY",
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return response.json();
}

/** Looks a product id up by slug through the public API. */
export async function productIdBySlug(page: Page, slug: string): Promise<string> {
  const response = await page.request.get(`/api/products/${slug}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.product.id;
}
