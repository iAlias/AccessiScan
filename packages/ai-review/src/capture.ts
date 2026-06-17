import type { Browser } from "playwright";
import type { PageContext, StorageStateLike } from "./types.js";

export interface AxeFinding { ruleId: string; impact: string | null; help: string | null; targetSelector: string }

const MAX_DOM = 20_000;

/** Re-render a page and capture its ARIA snapshot + a trimmed DOM excerpt. */
export async function capturePageContext(
  browser: Browser,
  url: string,
  axeFindings: AxeFinding[],
  storageState?: StorageStateLike,
): Promise<PageContext> {
  const context = await browser.newContext(storageState ? { storageState } : {});
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // page.accessibility was removed in Playwright 1.5x; ariaSnapshot() is the modern equivalent.
    const a11yTree = (await page.locator("body").ariaSnapshot().catch(() => "")) || "(empty)";
    const main = await page.$("main");
    const html = main ? await main.innerHTML().catch(() => "") : await page.content().catch(() => "");
    const domExcerpt = (html || "").slice(0, MAX_DOM);
    return { url, a11yTree, domExcerpt, axeFindings };
  } finally {
    await context.close();
  }
}
