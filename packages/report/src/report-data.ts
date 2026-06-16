import { getScanReport, getDomain } from "@accessscan/db";
import { WCAG_CATALOG, CATALOG_TOTAL } from "@accessscan/scanner";
import type { ReportModel } from "./report-model.js";

function touchedCoverage(): number {
  return WCAG_CATALOG.filter((e) => e.automatability !== "none").length / CATALOG_TOTAL;
}

function len(j: unknown): number { return Array.isArray(j) ? j.length : 0; }

export async function buildReportModel(scanId: string): Promise<ReportModel | null> {
  const scan = await getScanReport(scanId);
  if (!scan) return null;
  const domain = await getDomain(scan.domainId);
  const ev = (scan.engineVersions ?? {}) as { axe?: string; playwright?: string };
  return {
    scanId: scan.id,
    generatedAt: new Date().toISOString(),
    domain: {
      registrableDomain: domain?.registrableDomain ?? "",
      baseUrl: domain?.baseUrl ?? "",
    },
    score: scan.score,
    verdict: scan.verdict,
    coverageHeadline: scan.coverageRatio,
    coverageTouched: touchedCoverage(),
    pagesScanned: scan.pagesScanned,
    scanDate: scan.finishedAt ? scan.finishedAt.toISOString() : null,
    criteria: scan.criterionResults
      .map((c) => ({ wcagSc: c.wcagSc, en301549Clause: c.en301549Clause, state: c.state }))
      .sort((a, b) => a.wcagSc.localeCompare(b.wcagSc, undefined, { numeric: true })),
    issues: scan.pages.flatMap((pg) => pg.issues.map((i) => ({
      pageUrl: pg.url, ruleId: i.ruleId, wcagSc: i.wcagSc, en301549Clause: i.en301549Clause,
      impact: i.impact, targetSelector: i.targetSelector, help: i.help, helpUrl: i.helpUrl, failureSummary: i.failureSummary,
    }))),
    diff: scan.diff ? { newCount: len(scan.diff.newIssueIds), fixedCount: len(scan.diff.fixedIssueIds), persistentCount: len(scan.diff.persistentIssueIds) } : null,
    versions: { wcag: "WCAG 2.1 AA", en: "EN 301 549 v3.2.1", axe: ev.axe ?? "?", playwright: ev.playwright ?? "?" },
  };
}
