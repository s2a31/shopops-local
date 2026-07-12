import { expect, test } from "@playwright/test";

test("an invalid session cookie is treated as guest with a login redirect", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    {
      name: "shopops_session",
      value: "forged-or-expired-token-value",
      url: baseURL ?? "http://localhost:3100",
    },
  ]);

  await page.goto("/account");

  // The layout validates against the database, rejects the cookie, and sends
  // the visitor to sign in with a next target.
  await expect(page).toHaveURL(/\/login\?next=%2Faccount|\/login\?next=\/account/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
