import { prisma } from "../client.js";
import type { Verdict, CriterionState, Impact } from "@prisma/client";

export interface PersistedIssueRow {
  ruleId: string;
  scId: string;
  selector: string;
  pageUrlPath: string;
  maxImpact: "minor" | "moderate" | "serious" | "critical";
}

export interface ScanAnalysisInput {
  siteScore: number;
  pageScores: number[];
  verdict: Verdict;
  manualReviewLabel: boolean;
  coverageRatio: number;
  counts: { pass: number; fail: number; needsReview: number };
  states: Map<string, "PASS" | "FAIL" | "NEEDS_MANUAL_REVIEW">;
}

const IMPACT_DOWN: Record<Impact, "minor" | "moderate" | "serious" | "critical"> = {
  CRITICAL: "critical", SERIOUS: "serious", MODERATE: "moderate", MINOR: "minor",
};

function safePath(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

export async function loadCurrentScanIssues(scanId: string): Promise<PersistedIssueRow[]> {
  const issues = await prisma.issue.findMany({ where: { scanId }, include: { page: true } });
  return issues.map((i) => ({
    ruleId: i.ruleId,
    scId: i.wcagSc ?? "",
    selector: i.targetSelector,
    pageUrlPath: safePath(i.page.url),
    maxImpact: i.impact ? IMPACT_DOWN[i.impact] : "minor",
  }));
}

export async function getPreviousScanIssues(domainId: string, beforeScanId: string): Promise<PersistedIssueRow[]> {
  const current = await prisma.scan.findUnique({ where: { id: beforeScanId }, select: { createdAt: true } });
  const prev = await prisma.scan.findFirst({
    where: {
      domainId,
      status: "DONE",
      id: { not: beforeScanId },
      ...(current ? { createdAt: { lt: current.createdAt } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!prev) return [];
  return loadCurrentScanIssues(prev.id);
}

export async function persistScanScoring(input: {
  scanId: string;
  domainId: string;
  analysis: ScanAnalysisInput;
  prevIssues: PersistedIssueRow[];
  currIssues: PersistedIssueRow[];
}): Promise<void> {
  const { scanId, analysis } = input;
  // Dynamic import breaks the db→scanner cycle; type it to the db-side row shape
  // (structurally compatible with the scanner's PersistedIssue) so the call is checked.
  const mod = await import("@accessscan/scanner") as {
    computeScanDiff: (a: PersistedIssueRow[], b: PersistedIssueRow[]) => { newIssues: string[]; fixedIssues: string[]; persistentIssues: string[] };
  };
  const diff = mod.computeScanDiff(input.prevIssues, input.currIssues);

  await prisma.$transaction(async (tx) => {
    await tx.scan.update({
      where: { id: scanId },
      data: { score: analysis.siteScore, verdict: analysis.verdict, coverageRatio: analysis.coverageRatio },
    });
    // pageScores are in scan order; persist order matches insertion order, so add
    // a deterministic `id` tiebreaker for pages whose scannedAt collide.
    const pages = await tx.page.findMany({ where: { scanId }, orderBy: [{ scannedAt: "asc" }, { id: "asc" }] });
    for (let i = 0; i < pages.length; i++) {
      const ps = analysis.pageScores[i];
      if (ps !== undefined) await tx.page.update({ where: { id: pages[i]!.id }, data: { pageScore: ps } });
    }
    for (const [wcagSc, state] of analysis.states) {
      await tx.criterionResult.upsert({
        where: { scanId_wcagSc: { scanId, wcagSc } },
        update: { state: state as CriterionState },
        create: { scanId, wcagSc, en301549Clause: `9.${wcagSc}`, state: state as CriterionState, source: "AUTOMATED" },
      });
    }
    await tx.scoreHistory.upsert({
      where: { scanId },
      update: {
        score: analysis.siteScore, verdict: analysis.verdict,
        failCount: analysis.counts.fail, needsReviewCount: analysis.counts.needsReview, passCount: analysis.counts.pass,
      },
      create: {
        domainId: input.domainId, scanId, score: analysis.siteScore, verdict: analysis.verdict,
        failCount: analysis.counts.fail, needsReviewCount: analysis.counts.needsReview, passCount: analysis.counts.pass,
      },
    });
    await tx.scanDiff.upsert({
      where: { scanId },
      update: { newIssueIds: diff.newIssues, fixedIssueIds: diff.fixedIssues, persistentIssueIds: diff.persistentIssues },
      create: { scanId, newIssueIds: diff.newIssues, fixedIssueIds: diff.fixedIssues, persistentIssueIds: diff.persistentIssues },
    });
  });
}
