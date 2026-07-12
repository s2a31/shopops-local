/**
 * Resets the isolated E2E/test database to the deterministic e2e seed state:
 * loads .env.test, refuses to touch anything but shopops_test, applies
 * migrations, then reseeds with the e2e profile (fixed fixtures like the
 * one-unit Prism Accent Spotlight).
 */
import { execSync } from "node:child_process";

process.loadEnvFile(".env.test");

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("shopops_test")) {
  throw new Error(`Refusing to reset: DATABASE_URL does not point at shopops_test (${url}).`);
}

const run = (command: string) =>
  execSync(command, {
    env: { ...process.env, SEED_PROFILE: "e2e" },
    stdio: "inherit",
  });

run("pnpm prisma migrate deploy");
run("pnpm exec tsx prisma/seed.ts");
