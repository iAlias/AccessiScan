import { expect, test } from "vitest";
import { crawl, type FetchResult, type CrawledPage } from "../src/crawl.js";
import { defaultCrawlConfig } from "@accessscan/db";

function graph(): Record<string, FetchResult> {
  const B = "https://a.it";
  return {
    [`${B}/`]: { status: 200, finalUrl: `${B}/`, links: [`${B}/about`, `${B}/contact`, "https://other.com/x"] },
    [`${B}/about`]: { status: 200, finalUrl: `${B}/about`, links: [`${B}/`, `${B}/contact`] },
    [`${B}/contact`]: { status: 200, finalUrl: `${B}/contact`, links: [`${B}/about`] },
  };
}
const deps = (g: Record<string, FetchResult>) => ({
  fetchPage: async (u: string) => g[u] ?? { status: 404, finalUrl: u, links: [] },
  fetchText: async () => null,
  sleep: async () => {},
});

test("returns CrawledPage records with url/depth/status/discoveredVia", async () => {
  const out = await crawl("https://a.it/", { ...defaultCrawlConfig }, deps(graph()));
  const home = out.find((p) => p.url === "https://a.it/")!;
  expect(home).toMatchObject({ url: "https://a.it/", depth: 0, status: 200, discoveredVia: "BFS" });
  expect(out.map((p) => p.url).sort()).toEqual(["https://a.it/", "https://a.it/about", "https://a.it/contact"]);
  expect(out.find((p) => p.url === "https://a.it/about")!.depth).toBe(1);
});
test("sitemap seeds are tagged SITEMAP", async () => {
  const out = await crawl("https://a.it/", { ...defaultCrawlConfig }, { ...deps(graph()), seeds: ["https://a.it/contact"] });
  expect(out.find((p) => p.url === "https://a.it/contact")!.discoveredVia).toBe("SITEMAP");
});
test("honors maxPages and maxDepth", async () => {
  const two = await crawl("https://a.it/", { ...defaultCrawlConfig, maxPages: 2 }, deps(graph()));
  expect(two.length).toBe(2);
  const d0 = await crawl("https://a.it/", { ...defaultCrawlConfig, maxDepth: 0 }, deps(graph()));
  expect(d0.map((p) => p.url)).toEqual(["https://a.it/"]);
});
