import { XMLParser } from "fast-xml-parser";
import { registrableDomain } from "@accessscan/db";

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (name) => name === "sitemap" || name === "url",
});

/** When an allow-domain is set, keep only same-registrable-domain URLs (crawl integrity + SSRF defense-in-depth). */
function sameDomain(url: string, allowedDomain?: string): boolean {
  if (!allowedDomain) return true;
  try {
    return registrableDomain(url) === allowedDomain;
  } catch {
    return false;
  }
}

export async function fetchSitemapUrls(
  sitemapUrl: string,
  fetchText: (u: string) => Promise<string | null>,
  seen = new Set<string>(),
  depth = 0,
  allowedDomain?: string,
): Promise<string[]> {
  if (depth > 5 || seen.has(sitemapUrl)) return [];
  seen.add(sitemapUrl);
  const xml = await fetchText(sitemapUrl);
  if (!xml) return [];
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const d = doc as { sitemapindex?: { sitemap?: Array<{ loc?: unknown }> }; urlset?: { url?: Array<{ loc?: unknown }> } };
  if (d?.sitemapindex?.sitemap) {
    const out: string[] = [];
    for (const s of d.sitemapindex.sitemap) {
      if (s?.loc && sameDomain(String(s.loc), allowedDomain)) {
        out.push(...(await fetchSitemapUrls(String(s.loc), fetchText, seen, depth + 1, allowedDomain)));
      }
    }
    return out;
  }
  if (d?.urlset?.url) {
    return d.urlset.url.map((u) => u?.loc).filter(Boolean).map(String).filter((u) => sameDomain(u, allowedDomain));
  }
  return [];
}
