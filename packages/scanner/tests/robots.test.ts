import { expect, test } from "vitest";
import { loadRobots } from "../src/robots.js";

const BODY = `User-agent: *\nDisallow: /private\nSitemap: https://a.it/sitemap.xml\n`;
const fetchText = (map: Record<string, string | null>) => async (u: string) => map[u] ?? null;

test("disallows blocked path, allows others", async () => {
  const r = await loadRobots("https://a.it", "AccessScan", fetchText({ "https://a.it/robots.txt": BODY }));
  expect(r.isAllowed("https://a.it/private/x")).toBe(false);
  expect(r.isAllowed("https://a.it/public")).toBe(true);
});
test("exposes sitemap lines", async () => {
  const r = await loadRobots("https://a.it", "AccessScan", fetchText({ "https://a.it/robots.txt": BODY }));
  expect(r.sitemaps).toContain("https://a.it/sitemap.xml");
});
test("missing robots.txt => default-allow", async () => {
  const r = await loadRobots("https://a.it", "AccessScan", fetchText({ "https://a.it/robots.txt": null }));
  expect(r.isAllowed("https://a.it/anything")).toBe(true);
  expect(r.sitemaps).toEqual([]);
});
