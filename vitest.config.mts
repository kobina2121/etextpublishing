import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests: schemas and pure helpers, no database and no browser.
 *
 * Playwright owns everything that needs the running app (see
 * playwright.config.ts), so the two never pick up each other's files.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
