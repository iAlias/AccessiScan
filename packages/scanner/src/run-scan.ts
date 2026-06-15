import {
  prisma, markScanRunning, persistPageWithIssues, markScanDone, markScanFailed,
  defaultCrawlConfig, type CrawlConfig,
} from "@accessscan/db";
import { getBrowser, scanUrl } from "./scanner.js";
import { crawl } from "./crawl.js";
import { makeFetchPage } from "./playwright-adapter.js";
import { loadRobots } from "./robots.js";
import { fetchSitemapUrls } from "./sitemap.js";
import { toIssueRow } from "./mapper.js";

const UA = "AccessScanBot";

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

export async function runScan(scanId: string): Promise<void> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, include: { domain: true } });
  if (!scan) throw new Error(`Scan not found: ${scanId}`);
  const domain = scan.domain;
  const cfg: CrawlConfig = { ...defaultCrawlConfig, ...(domain.crawlConfig as Partial<CrawlConfig>) };
  const origin = new URL(domain.baseUrl).origin;

  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    await markScanRunning(scanId, { axe: "4.11.4", playwright: "1.61.0", profile: "wcag21aa-en301549" });

    const robots = await loadRobots(origin, UA, fetchText);
    const sitemapSources = robots.sitemaps.length
      ? robots.sitemaps
      : [new URL("/sitemap.xml", origin).toString()];
    const seen = new Set<string>();
    const seeds: string[] = [];
    for (const sm of sitemapSources) seeds.push(...(await fetchSitemapUrls(sm, fetchText, seen)));

    const page = await context.newPage();
    const pages = await crawl(domain.baseUrl, cfg, {
      fetchPage: makeFetchPage(page),
      fetchText,
      seeds,
      isAllowed: cfg.respectRobotsTxt ? robots.isAllowed : undefined,
    });
    await page.close();

    let scanned = 0;
    let skipped = 0;
    for (const cp of pages) {
      if (cp.status < 200 || cp.status >= 300) { skipped += 1; continue; }
      try {
        const { violations } = await scanUrl(cp.url);
        const issues = violations.flatMap((rule) => rule.nodes.map((node) => toIssueRow(rule, node)));
        await persistPageWithIssues(scanId, { url: cp.url, httpStatus: cp.status, depth: cp.depth, discoveredVia: cp.discoveredVia }, issues);
        scanned += 1;
      } catch {
        skipped += 1;
      }
    }
    await markScanRunning(scanId, { axe: "4.11.4", playwright: "1.61.0", profile: "wcag21aa-en301549", skipped });
    await markScanDone(scanId, scanned);
  } catch (err) {
    await markScanFailed(scanId);
    throw err;
  } finally {
    await context.close();
  }
}
