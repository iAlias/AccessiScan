import { registrableDomain } from "@accessscan/db";
import type { CrawlConfig, DiscoveredVia } from "@accessscan/db";
import { canonicalizeUrl } from "./canonical-url.js";

function safeScope(url: string): string {
  try {
    return registrableDomain(url);
  } catch {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }
}

export interface FetchResult {
  status: number;
  finalUrl: string;
  links: string[];
}

export interface CrawledPage {
  url: string;
  depth: number;
  status: number;
  discoveredVia: DiscoveredVia;
}

export interface CrawlDeps {
  fetchPage: (url: string) => Promise<FetchResult>;
  fetchText: (url: string) => Promise<string | null>;
  seeds?: string[];
  isAllowed?: (url: string) => boolean;
  sleep?: (ms: number) => Promise<void>;
  /** Reports the running count of scannable (2xx) pages discovered so far. */
  onPage?: (count: number) => void | Promise<void>;
  /** Checked before each fetch; if it resolves true the crawl stops early (cooperative cancel). */
  shouldStop?: () => boolean | Promise<boolean>;
}

export async function crawl(startUrl: string, cfg: CrawlConfig, deps: CrawlDeps): Promise<CrawledPage[]> {
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const isAllowed = deps.isAllowed ?? (() => true);
  const rootDomain = safeScope(startUrl);
  if (!rootDomain) return [];
  const start = canonicalizeUrl(startUrl);
  if (!start) return [];
  const visited = new Set<string>([start]);
  const out: CrawledPage[] = [];
  const queue: Array<{ url: string; depth: number; via: DiscoveredVia }> = [{ url: start, depth: 0, via: "BFS" }];

  for (const seed of deps.seeds ?? []) {
    const c = canonicalizeUrl(seed);
    if (!c || visited.has(c)) continue;
    if (safeScope(c) !== rootDomain) continue;
    visited.add(c);
    queue.push({ url: c, depth: 0, via: "SITEMAP" });
  }

  while (queue.length && out.length < cfg.maxPages) {
    if (deps.shouldStop && (await deps.shouldStop())) break;
    const { url, depth, via } = queue.shift()!;
    if (!isAllowed(url)) continue;
    let res: FetchResult;
    try {
      res = await deps.fetchPage(url);
    } catch {
      continue;
    }
    if (res.status >= 200 && res.status < 300) {
      out.push({ url, depth, status: res.status, discoveredVia: via });
      if (deps.onPage) await deps.onPage(out.length);
    }
    if (depth >= cfg.maxDepth) {
      await sleep(cfg.sameDomainDelaySecs * 1000);
      continue;
    }
    for (const raw of res.links) {
      const c = canonicalizeUrl(raw, res.finalUrl);
      if (!c || visited.has(c)) continue;
      const dom = safeScope(c);
      if (!dom || dom !== rootDomain || !isAllowed(c)) continue;
      visited.add(c);
      if (visited.size > cfg.maxPages * 10) break;
      queue.push({ url: c, depth: depth + 1, via: "BFS" });
    }
    await sleep(cfg.sameDomainDelaySecs * 1000);
  }
  return out;
}
