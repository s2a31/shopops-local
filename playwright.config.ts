import { defineConfig, devices } from "@playwright/test";

// The E2E suite always runs against the isolated test database and port 3100
// (matching APP_URL so Origin validation passes), never the dev environment.
process.loadEnvFile(".env.test");

export default defineConfig({
  testDir: "./e2e",
  // One worker: suites share one seeded database, and 16 GB of RAM is happier.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm start",
    url: process.env.APP_URL ?? "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      APP_URL: process.env.APP_URL ?? "http://localhost:3100",
      PORT: process.env.PORT ?? "3100",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /mobile.*\.spec\.ts/,
    },
    {
      name: "mobile",
      // iPhone-14 viewport on Chromium: the device preset defaults to WebKit,
      // but the suite is Chromium-only by design (no WebKit binary installed).
      use: { ...devices["iPhone 14"], browserName: "chromium" },
      dependencies: ["setup"],
      testMatch: /mobile.*\.spec\.ts/,
    },
  ],
});
