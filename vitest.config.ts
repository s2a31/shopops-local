import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": src },
  },
  test: {
    projects: [
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [react()],
        resolve: { alias: { "@": src } },
        test: {
          name: "component",
          include: ["src/**/*.test.tsx"],
          environment: "happy-dom",
          // Testing Library's auto-cleanup hooks into the global afterEach.
          globals: true,
          setupFiles: ["./tests/component/setup.ts"],
        },
      },
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["./tests/integration/global-setup.ts"],
          setupFiles: ["./tests/integration/setup.ts"],
          // Integration suites share one test database — run files sequentially.
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
