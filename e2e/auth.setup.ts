import { test as setup } from "@playwright/test";

import { DEMO_ADMIN, DEMO_CUSTOMER, signIn } from "./helpers";

/**
 * Signs each demo role in once and saves its storage state, so the suite
 * reuses sessions instead of logging in per spec — staying far away from the
 * login rate limiter (10 attempts / 15 min per email) even with CI retries.
 * Specs whose subject is authentication itself still drive the login UI.
 */
setup("authenticate customer", async ({ page }) => {
  await signIn(page, DEMO_CUSTOMER);
  await page.context().storageState({ path: "e2e/.auth/customer.json" });
});

setup("authenticate admin", async ({ page }) => {
  await signIn(page, DEMO_ADMIN);
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
