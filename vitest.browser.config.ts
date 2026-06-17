import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.test" });

// Allow scanning local 127.0.0.1 test servers through the navigation SSRF guard.
process.env.ACCESSSCAN_ALLOW_LOOPBACK ??= "1";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "apps/web/src"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: ["packages/**/tests/**/*.browser.test.ts", "apps/**/tests/**/*.browser.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
