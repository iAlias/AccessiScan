import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (name) => name === "sitemap" || name === "url",
});

export async function fetchSitemapUrls(
  sitemapUrl: string,
  fetchText: (u: string) => Promise<string | null>,
  seen = new Set<string>(),
  depth = 0,
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
      if (s?.loc) out.push(...(await fetchSitemapUrls(String(s.loc), fetchText, seen, depth + 1)));
    }
    return out;
  }
  if (d?.urlset?.url) {
    return d.urlset.url.map((u) => u?.loc).filter(Boolean).map(String);
  }
  return [];
}
