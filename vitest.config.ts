import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config({ path: ".env.test" });

// Allow scanning local 127.0.0.1 test servers through the navigation SSRF guard.
// Production never sets this; assertPublicUrl stays strict.
process.env.ACCESSSCAN_ALLOW_LOOPBACK ??= "1";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/tests/**/*.test.ts", "apps/**/tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.browser.test.ts"],
    fileParallelism: false,
  },
});
