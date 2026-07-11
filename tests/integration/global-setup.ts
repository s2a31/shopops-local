import { execSync } from "node:child_process";

/**
 * Runs once before the integration project: loads .env.test (pointing at the
 * isolated shopops_test database) and brings its schema up to date. Fails loudly
 * if the Postgres container is not running.
 */
export default function globalSetup(): void {
  process.loadEnvFile(".env.test");

  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("shopops_test")) {
    throw new Error(
      `Refusing to run integration tests: DATABASE_URL does not point at shopops_test (${url}).`,
    );
  }

  try {
    execSync("pnpm prisma migrate deploy", {
      env: process.env,
      stdio: "pipe",
    });
  } catch (error) {
    throw new Error(
      "Could not migrate the test database. Is Postgres running? Start it with: pnpm db:up\n" +
        String(error),
    );
  }
}
