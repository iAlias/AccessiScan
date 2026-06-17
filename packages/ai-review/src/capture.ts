import type { Browser } from "playwright";
import { assertNavigableUrl } from "@accessscan/scanner";
import type { PageContext, StorageStateLike } from "./types.js";

export interface AxeFinding { ruleId: string; impact: string | null; help: string | null; targetSelector: string }

const MAX_DOM = 20_000;

/** Re-render a page and capture its ARIA snapshot + a trimmed DOM excerpt. */
export async function capturePageContext(
  browser: Browser,
  url: string,
  axeFindings: AxeFinding[],
  storageState?: StorageStateLike,
  validateUrl: (u: string) => Promise<unknown> = assertNavigableUrl,
): Promise<PageContext> {
  // SSRF guard: re-validate the URL at navigation time (the original scan's check
  // ran earlier against the base URL only — DNS could have rebound since).
  await validateUrl(url);
  const context = await browser.newContext(storageState ? { storageState } : {});
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (page.url() && page.url() !== url) await validateUrl(page.url()); // reject redirect to a private host
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
