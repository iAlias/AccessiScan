import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { crawl } from "../src/crawl.js";
import { makeFetchPage } from "../src/playwright-adapter.js";
import { defaultCrawlConfig } from "@accessscan/db";
import { startFixtureServer, type FixtureServer } from "./fixtures/server.js";
import { assertChromiumInstalled } from "./fixtures/preflight.js";

let srv: FixtureServer;
let browser: Browser;
beforeAll(async () => { assertChromiumInstalled(); srv = await startFixtureServer(); browser = await chromium.launch(); });
afterAll(async () => { await browser.close(); await srv.close(); });

it("crawls the fixture site and finds all 3 pages", async () => {
  const page = await browser.newPage();
  const out = await crawl(srv.url("/"), { ...defaultCrawlConfig, sameDomainDelaySecs: 0 }, {
    fetchPage: makeFetchPage(page),
    fetchText: async (u) => { const r = await fetch(u); return r.ok ? r.text() : null; },
    sleep: async () => {},
  });
  expect(out.map((p) => p.url).sort()).toEqual([srv.url("/"), srv.url("/about"), srv.url("/contact")].sort());
}, 60_000);
