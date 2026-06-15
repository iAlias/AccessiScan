import { expect, test } from "vitest";
import { crawl, type FetchResult } from "../src/crawl.js";
import { defaultCrawlConfig } from "@accessscan/db";

function graph(): Record<string, FetchResult> {
  const B = "https://a.it";
  return {
    [`${B}/`]: { status: 200, finalUrl: `${B}/`, links: [`${B}/about`, `${B}/contact`, "https://other.com/x"] },
    [`${B}/about`]: { status: 200, finalUrl: `${B}/about`, links: [`${B}/`, `${B}/contact`] },
    [`${B}/contact`]: { status: 200, finalUrl: `${B}/contact`, links: [`${B}/about`] },
  };
}

test("BFS discovers same-domain pages, dedupes the cycle, rejects off-domain", async () => {
  const g = graph();
  const out = await crawl("https://a.it/", { ...defaultCrawlConfig, sameDomainDelaySecs: 0 }, {
    fetchPage: async (u) => g[u] ?? { status: 404, finalUrl: u, links: [] },
    fetchText: async () => null,
    sleep: async () => {},
  });
  expect(out.sort()).toEqual(["https://a.it/", "https://a.it/about", "https://a.it/contact"]);
});
test("honors maxPages", async () => {
  const g = graph();
  const out = await crawl("https://a.it/", { ...defaultCrawlConfig, sameDomainDelaySecs: 0, maxPages: 2 }, {
    fetchPage: async (u) => g[u] ?? { status: 404, finalUrl: u, links: [] },
    fetchText: async () => null,
    sleep: async () => {},
  });
  expect(out.length).toBe(2);
});
test("maxDepth stops link expansion but records the page", async () => {
  const g = graph();
  const out = await crawl("https://a.it/", { ...defaultCrawlConfig, sameDomainDelaySecs: 0, maxDepth: 0 }, {
    fetchPage: async (u) => g[u] ?? { status: 404, finalUrl: u, links: [] },
    fetchText: async () => null,
    sleep: async () => {},
  });
  expect(out).toEqual(["https://a.it/"]);
});
