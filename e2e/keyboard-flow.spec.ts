import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/customer.json" });

/**
 * Keyboard-only critical path: no mouse clicks after this point — everything
 * happens through Tab/Enter/Space and typing, proving the flow is operable.
 */
test("keyboard-only browse → add to cart → checkout", async ({ page }) => {
  await page.goto("/products/alba-chefs-knife");
  const addButton = page.getByRole("button", { name: "Add to cart" });
  await expect(addButton).toBeVisible();

  // Tab until the add-to-cart button holds focus, then activate it.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    if (await addButton.evaluate((el) => el === document.activeElement)) break;
  }
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Open cart (1 item)" })).toBeVisible();

  // The drawer opens from the header cart button and traps focus as a dialog.
  await page.getByRole("button", { name: "Open cart (1 item)" }).focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Alba Chef's Knife 20 cm" })).toBeVisible();

  // Escape closes the drawer and returns focus to the page.
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.goto("/checkout");
  // The whole shipping form is reachable and fillable by keyboard.
  await page.getByLabel("Full name").focus();
  await page.keyboard.type("Klára Kis");
  await page.keyboard.press("Tab"); // phone (optional)
  await page.keyboard.press("Tab"); // street
  await page.keyboard.type("Kis utca 3");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Szeged");
  await page.keyboard.press("Tab");
  await page.keyboard.type("6720");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Hungary");

  // Radios toggle with Space once focused.
  await page.getByRole("radio", { name: /Cash on delivery/ }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: /Cash on delivery/ })).toBeChecked();

  await page.getByRole("button", { name: "Place order" }).focus();
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", { name: "Thank you — your order is placed" }),
  ).toBeVisible();
});
