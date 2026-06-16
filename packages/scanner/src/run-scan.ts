import {
  prisma, markScanRunning, persistPageWithIssues, markScanDone, markScanFailed,
  defaultCrawlConfig, type CrawlConfig,
  persistScanScoring, loadCurrentScanIssues, getPreviousScanIssues,
  getLoginRecipe, resolveSecretsForDomain,
} from "@accessscan/db";
import type { Browser } from "playwright";
import { getBrowser, scanUrl, type StorageState } from "./scanner.js";
import { executeLogin, mapRecipe } from "./recipe-runner.js";
import { crawl } from "./crawl.js";
import { makeFetchPage } from "./playwright-adapter.js";
import { loadRobots } from "./robots.js";
import { fetchSitemapUrls } from "./sitemap.js";
import { toIssueRow } from "./mapper.js";
import { collectPageFindings, collectSCSets } from "./sc-mapping.js";
import { buildScanAnalysis } from "./scan-analysis.js";
import type { CriterionFinding } from "./sc-mapping.js";
import type { SCId } from "./wcag-catalog.js";

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
  let context: Awaited<ReturnType<Browser["newContext"]>> | null = null;
  try {
    await markScanRunning(scanId, { axe: "4.11.4", playwright: "1.61.0", profile: "wcag21aa-en301549" });

    // Authenticated scan: if a login recipe exists, log in once and reuse the
    // resulting session for both the crawl and every page scan. storageState is
    // held in memory only and never persisted. Secrets are resolved at use and
    // never logged. Auth failure fails the whole scan (auth was requested).
    let storageState: StorageState | undefined;
    const recipe = await getLoginRecipe(domain.id);
    if (recipe) {
      const secrets = await resolveSecretsForDomain(domain.id);
      storageState = await executeLogin(browser, mapRecipe(recipe), (ref) => {
        const v = secrets.get(ref);
        if (v === undefined) throw new Error(`No credential for valueRef: ${ref}`);
        return Promise.resolve(v);
      });
    }
    const authState = storageState ? "AUTHED" : "ANON";
    context = await browser.newContext(storageState ? { storageState } : {});

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

    const perPageFindings: CriterionFinding[][] = [];
    const reviewSCs = new Set<SCId>();

    let scanned = 0;
    let skipped = 0;
    for (const cp of pages) {
      if (cp.status < 200 || cp.status >= 300) { skipped += 1; continue; }
      try {
        const { violations, incomplete } = await scanUrl(cp.url, { storageState });
        const issues = violations.flatMap((rule) => rule.nodes.map((node) => toIssueRow(rule, node)));
        await persistPageWithIssues(scanId, { url: cp.url, httpStatus: cp.status, depth: cp.depth, discoveredVia: cp.discoveredVia, authState }, issues);
        perPageFindings.push(collectPageFindings({ violations, incomplete }));
        const { reviewSCs: r } = collectSCSets({ violations, incomplete });
        for (const sc of r) reviewSCs.add(sc);
        scanned += 1;
      } catch {
        skipped += 1;
      }
    }
    await markScanRunning(scanId, { axe: "4.11.4", playwright: "1.61.0", profile: "wcag21aa-en301549", skipped });
    const analysis = buildScanAnalysis({ perPageFindings, reviewSCs });
    const currIssues = await loadCurrentScanIssues(scanId);
    const prevIssues = await getPreviousScanIssues(domain.id, scanId);
    await persistScanScoring({ scanId, domainId: domain.id, analysis, prevIssues, currIssues });
    await markScanDone(scanId, scanned);
  } catch (err) {
    await markScanFailed(scanId);
    throw err;
  } finally {
    if (context) await context.close();
  }
}
