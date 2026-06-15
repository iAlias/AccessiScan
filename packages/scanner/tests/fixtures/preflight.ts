import { chromium } from "playwright";
import { existsSync } from "node:fs";

export function assertChromiumInstalled(): void {
  const exe = chromium.executablePath();
  if (!exe || !existsSync(exe)) {
    throw new Error(`Chromium not installed at ${exe || "(unknown)"}. Run: pnpm --filter @accessscan/scanner exec playwright install chromium`);
  }
}
