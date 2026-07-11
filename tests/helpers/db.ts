import { prisma } from "@/lib/db";

/**
 * Empties every table and restarts sequences. Integration test files call this
 * in beforeEach so every test starts from a clean, known state.
 */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "InventoryAdjustment",
      "OrderItem",
      "Order",
      "Session",
      "ProductImage",
      "Product",
      "Category",
      "User"
    RESTART IDENTITY CASCADE
  `);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "order_number_seq" RESTART WITH 1042`);
}
