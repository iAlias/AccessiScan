import { expect, test } from "vitest";
import { fetchSitemapUrls } from "../src/sitemap.js";

const URLSET_MULTI = `<?xml version="1.0"?><urlset><url><loc>https://a.it/1</loc></url><url><loc>https://a.it/2</loc></url></urlset>`;
const URLSET_SINGLE = `<?xml version="1.0"?><urlset><url><loc>https://a.it/only</loc></url></urlset>`;
const INDEX = `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://a.it/child.xml</loc></sitemap></sitemapindex>`;

function fakeFetch(map: Record<string, string>) {
  return async (u: string) => map[u] ?? null;
}

test("parses a urlset with multiple urls", async () => {
  const out = await fetchSitemapUrls("https://a.it/s.xml", fakeFetch({ "https://a.it/s.xml": URLSET_MULTI }));
  expect(out).toEqual(["https://a.it/1", "https://a.it/2"]);
});
test("parses a urlset with a SINGLE url (array coercion)", async () => {
  const out = await fetchSitemapUrls("https://a.it/s.xml", fakeFetch({ "https://a.it/s.xml": URLSET_SINGLE }));
  expect(out).toEqual(["https://a.it/only"]);
});
test("recurses into a sitemap index", async () => {
  const out = await fetchSitemapUrls("https://a.it/s.xml", fakeFetch({
    "https://a.it/s.xml": INDEX,
    "https://a.it/child.xml": URLSET_MULTI,
  }));
  expect(out).toEqual(["https://a.it/1", "https://a.it/2"]);
});
test("returns [] on malformed xml and on missing body", async () => {
  expect(await fetchSitemapUrls("https://a.it/s.xml", fakeFetch({ "https://a.it/s.xml": "<broken" }))).toEqual([]);
  expect(await fetchSitemapUrls("https://a.it/none.xml", fakeFetch({}))).toEqual([]);
});
