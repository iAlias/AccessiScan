import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import type { Result as AxeResult } from "axe-core";

export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({ headless: true });
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    browserPromise = null;
    await b.close();
  }
}

export interface ScanResult {
  url: string;
  violations: AxeResult[];
  incomplete: AxeResult[];
}

export interface ScanUrlOptions {
  /** Authenticated session to reuse (cookies + localStorage) for AUTHED scans. */
  storageState?: StorageState;
}

export async function scanUrl(url: string, options?: ScanUrlOptions): Promise<ScanResult> {
  const browser = await getBrowser();
  const context = await browser.newContext(
    options?.storageState ? { storageState: options.storageState } : {},
  );
  try {
    const page: Page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator("main, [role=\"main\"], body").first().waitFor({ state: "visible", timeout: 15_000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "EN-301-549"])
      .analyze();
    return { url, violations: results.violations, incomplete: results.incomplete };
  } finally {
    await context.close();
  }
}

export { getBrowser };
