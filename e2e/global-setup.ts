import { execSync } from "node:child_process";

/**
 * Runs once before the E2E suite: resets the isolated test database to the
 * deterministic e2e seed state. The reset script refuses to touch any
 * database other than shopops_test.
 */
export default function globalSetup(): void {
  try {
    execSync("pnpm exec tsx scripts/reset-test-db.ts", { stdio: "inherit" });
  } catch (error) {
    throw new Error(
      "Could not reset the test database. Is Postgres running? Start it with: pnpm db:up\n" +
        String(error),
    );
  }
}
