import type { Page, Response as PwResponse } from "playwright";
import { assertNavigableUrl } from "./url-guard.js";

/**
 * page.goto with an SSRF guard: validates the URL before navigating AND re-validates
 * the post-redirect final URL, so a redirect to a private/internal/metadata host is
 * rejected (UnsafeUrlError) instead of being loaded and scanned.
 */
export async function safeGoto(
  page: Page,
  url: string,
  opts?: Parameters<Page["goto"]>[1],
): Promise<PwResponse | null> {
  await assertNavigableUrl(url);
  const resp = await page.goto(url, opts);
  const final = page.url();
  if (final && final !== url) await assertNavigableUrl(final);
  return resp;
}
