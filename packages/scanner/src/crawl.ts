import { registrableDomain } from "@accessscan/db";
import type { CrawlConfig } from "@accessscan/db";
import { canonicalizeUrl } from "./canonical-url.js";

export interface FetchResult {
  status: number;
  finalUrl: string;
  links: string[];
}

export interface CrawlDeps {
  fetchPage: (url: string) => Promise<FetchResult>;
  fetchText: (url: string) => Promise<string | null>;
  seeds?: string[];
  isAllowed?: (url: string) => boolean;
  sleep?: (ms: number) => Promise<void>;
}

export async function crawl(startUrl: string, cfg: CrawlConfig, deps: CrawlDeps): Promise<string[]> {
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const isAllowed = deps.isAllowed ?? (() => true);
  let rootDomain: string;
  try {
    rootDomain = registrableDomain(startUrl);
  } catch {
    return [];
  }
  const start = canonicalizeUrl(startUrl);
  if (!start) return [];
  const visited = new Set<string>([start]);
  const out: string[] = [];
  const queue: Array<{ url: string; depth: number }> = [{ url: start, depth: 0 }];

  for (const seed of deps.seeds ?? []) {
    const c = canonicalizeUrl(seed);
    if (!c || visited.has(c)) continue;
    try {
      if (registrableDomain(c) !== rootDomain) continue;
    } catch {
      continue;
    }
    visited.add(c);
    queue.push({ url: c, depth: 0 });
  }

  while (queue.length && out.length < cfg.maxPages) {
    const { url, depth } = queue.shift()!;
    if (!isAllowed(url)) continue;
    let res: FetchResult;
    try {
      res = await deps.fetchPage(url);
    } catch {
      continue;
    }
    if (res.status >= 200 && res.status < 300) out.push(url);
    if (depth >= cfg.maxDepth) {
      await sleep(cfg.sameDomainDelaySecs * 1000);
      continue;
    }
    for (const raw of res.links) {
      const c = canonicalizeUrl(raw, res.finalUrl);
      if (!c || visited.has(c)) continue;
      let dom: string;
      try {
        dom = registrableDomain(c);
      } catch {
        continue;
      }
      if (dom !== rootDomain || !isAllowed(c)) continue;
      visited.add(c);
      if (visited.size > cfg.maxPages * 10) break;
      queue.push({ url: c, depth: depth + 1 });
    }
    await sleep(cfg.sameDomainDelaySecs * 1000);
  }
  return out;
}
