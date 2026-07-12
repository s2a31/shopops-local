import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

test("a stock adjustment updates the level and the audit log", async ({ page }) => {
  await page.goto("/admin/inventory");

  await page.getByLabel("Search").fill("Northwind Hammock");
  await page.getByRole("button", { name: "Search" }).click();

  // Scoped to the stock section — the adjustment-history table on the same
  // page also has rows mentioning the product.
  const stockSection = page.getByRole("region", { name: "Stock levels" });
  const row = stockSection.getByRole("row").filter({ hasText: "Northwind Hammock" });
  await expect(row).toBeVisible();
  const before = Number(await row.getByRole("cell").nth(1).textContent());

  await page.getByRole("button", { name: "Adjust stock for Northwind Hammock" }).click();
  const dialog = page.getByRole("dialog", { name: "Adjust stock for Northwind Hammock" });
  await dialog.getByLabel(/Change/).fill("5");
  await dialog.getByLabel("Reason").selectOption({ label: "Restock" });
  await dialog.getByLabel("Note (optional)").fill("E2E restock fixture");
  await dialog.getByRole("button", { name: "Apply adjustment" }).click();

  // The stock row reflects the new quantity…
  await expect(row.getByRole("cell").nth(1)).toHaveText(String(before + 5));
  // …and the append-only ledger shows the attributed entry.
  await expect(
    page
      .getByRole("region", { name: "Adjustment history" })
      .getByRole("row")
      .filter({ hasText: "E2E restock fixture" })
      .filter({ hasText: "Restock" }),
  ).toBeVisible();
});
