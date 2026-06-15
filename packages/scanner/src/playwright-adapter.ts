import type { Page } from "playwright";
import type { FetchResult } from "./crawl.js";

export function makeFetchPage(page: Page): (url: string) => Promise<FetchResult> {
  return async (url: string): Promise<FetchResult> => {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    const links = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).href));
    return { status: resp?.status() ?? 0, finalUrl: page.url(), links };
  };
}
