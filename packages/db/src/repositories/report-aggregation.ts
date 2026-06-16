import { prisma } from "../client.js";
import type { Impact, CriterionState, Verdict } from "@prisma/client";

/** Severity ordering: lower rank = more severe (sorted first). */
const IMPACT_RANK: Record<Impact, number> = { CRITICAL: 0, SERIOUS: 1, MODERATE: 2, MINOR: 3 };
const impactRank = (i: Impact | null): number => (i ? IMPACT_RANK[i] : 99);

// ── Aggregated issues by rule ────────────────────────────────────────────────

export interface RuleAggregate {
  ruleId: string;
  wcagSc: string | null;
  en301549Clause: string | null;
  impact: Impact | null;
  help: string | null;
  helpUrl: string | null;
  occurrences: number; // sum of occurrenceCount across all pages
  affectedPages: number; // distinct pages where the rule fires
}

/**
 * Groups every issue of a scan by rule, returning total occurrences and the
 * number of affected pages, sorted by severity then occurrences. This is the
 * auditor-grade "what is wrong and how widespread" view.
 */
export async function getIssuesByRule(scanId: string): Promise<RuleAggregate[]> {
  const rows = await prisma.issue.findMany({
    where: { scanId },
    select: {
      ruleId: true, wcagSc: true, en301549Clause: true, impact: true,
      help: true, helpUrl: true, pageId: true, occurrenceCount: true,
    },
  });
  const map = new Map<string, RuleAggregate & { pages: Set<string> }>();
  for (const r of rows) {
    let e = map.get(r.ruleId);
    if (!e) {
      e = {
        ruleId: r.ruleId, wcagSc: r.wcagSc, en301549Clause: r.en301549Clause,
        impact: r.impact, help: r.help, helpUrl: r.helpUrl,
        occurrences: 0, affectedPages: 0, pages: new Set<string>(),
      };
      map.set(r.ruleId, e);
    }
    e.occurrences += r.occurrenceCount;
    e.pages.add(r.pageId);
    // Keep the most severe impact seen for the rule (guards against null/mixed rows).
    if (impactRank(r.impact) < impactRank(e.impact)) e.impact = r.impact;
  }
  const out = [...map.values()].map(({ pages, ...rest }) => ({ ...rest, affectedPages: pages.size }));
  out.sort(
    (a, b) =>
      impactRank(a.impact) - impactRank(b.impact) ||
      b.occurrences - a.occurrences ||
      a.ruleId.localeCompare(b.ruleId),
  );
  return out;
}

// ── Per-page issue counts ────────────────────────────────────────────────────

export interface PageSummary {
  id: string;
  url: string;
  issueCount: number; // distinct issue rows on the page
}

/** All scanned pages with their issue count, worst first. */
export async function getPageSummaries(scanId: string): Promise<PageSummary[]> {
  const pages = await prisma.page.findMany({
    where: { scanId },
    select: { id: true, url: true, _count: { select: { issues: true } } },
  });
  return pages
    .map((p) => ({ id: p.id, url: p.url, issueCount: p._count.issues }))
    .sort((a, b) => b.issueCount - a.issueCount || a.url.localeCompare(b.url));
}

// ── On-demand per-page issue detail ──────────────────────────────────────────

export interface PageIssue {
  id: string;
  ruleId: string;
  wcagSc: string | null;
  impact: Impact | null;
  help: string | null;
  helpUrl: string | null;
  targetSelector: string;
  failureSummary: string | null;
  occurrenceCount: number;
}

/** Issues for a single page, severity-sorted — loaded lazily when a row expands. */
export async function getPageIssues(scanId: string, pageId: string): Promise<PageIssue[]> {
  const issues = await prisma.issue.findMany({
    where: { scanId, pageId },
    select: {
      id: true, ruleId: true, wcagSc: true, impact: true, help: true,
      helpUrl: true, targetSelector: true, failureSummary: true, occurrenceCount: true,
    },
  });
  return issues.sort(
    (a, b) => impactRank(a.impact) - impactRank(b.impact) || a.ruleId.localeCompare(b.ruleId),
  );
}

// ── Lightweight report core (header + criteria, no issue dump) ────────────────

const reportCoreSelect = {
  id: true, status: true, score: true, verdict: true, coverageRatio: true,
  pagesScanned: true, finishedAt: true, createdAt: true,
  domain: {
    select: {
      id: true, registrableDomain: true, baseUrl: true,
      project: { select: { name: true } },
    },
  },
  criterionResults: { select: { wcagSc: true, en301549Clause: true, state: true } },
} as const;

/** Header + criteria for the report page, without loading every issue row. */
export function getReportCore(scanId: string) {
  return prisma.scan.findUnique({ where: { id: scanId }, select: reportCoreSelect });
}

// ── Comparison against the previous completed scan ───────────────────────────

export interface CriterionChange {
  wcagSc: string;
  from: CriterionState;
  to: CriterionState;
}

export interface ScanComparison {
  hasPrevious: boolean;
  prevScanId: string | null;
  prevDate: Date | null;
  score: { current: number | null; previous: number | null };
  verdict: { current: Verdict | null; previous: Verdict | null };
  totalIssues: { current: number; previous: number };
  pagesScanned: { current: number; previous: number };
  worsened: CriterionChange[];
  improved: CriterionChange[];
}

/** Severity of a criterion outcome (higher = worse) for change detection. */
const STATE_SEVERITY: Record<CriterionState, number> = {
  PASS: 0, NOT_APPLICABLE: 0, NEEDS_MANUAL_REVIEW: 1, FAIL: 2,
};

/**
 * Compares a scan to the previous DONE scan of the same domain, returning
 * human-readable deltas (score, verdict, total issues, criteria that changed
 * state) instead of raw issue-id counts.
 */
export async function getScanComparison(scanId: string): Promise<ScanComparison> {
  const cur = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { id: true, domainId: true, createdAt: true, score: true, verdict: true, pagesScanned: true },
  });
  const curIssues = await prisma.issue.count({ where: { scanId } });
  const empty: ScanComparison = {
    hasPrevious: false, prevScanId: null, prevDate: null,
    score: { current: cur?.score ?? null, previous: null },
    verdict: { current: cur?.verdict ?? null, previous: null },
    totalIssues: { current: curIssues, previous: 0 },
    pagesScanned: { current: cur?.pagesScanned ?? 0, previous: 0 },
    worsened: [], improved: [],
  };
  if (!cur) return empty;

  const prev = await prisma.scan.findFirst({
    where: { domainId: cur.domainId, status: "DONE", id: { not: cur.id }, createdAt: { lt: cur.createdAt } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, score: true, verdict: true, pagesScanned: true },
  });
  if (!prev) return empty;

  const [prevIssues, curCrit, prevCrit] = await Promise.all([
    prisma.issue.count({ where: { scanId: prev.id } }),
    prisma.criterionResult.findMany({ where: { scanId }, select: { wcagSc: true, state: true } }),
    prisma.criterionResult.findMany({ where: { scanId: prev.id }, select: { wcagSc: true, state: true } }),
  ]);

  const prevStates = new Map(prevCrit.map((c) => [c.wcagSc, c.state]));
  const worsened: CriterionChange[] = [];
  const improved: CriterionChange[] = [];
  for (const c of curCrit) {
    const before = prevStates.get(c.wcagSc);
    if (!before || before === c.state) continue;
    const change: CriterionChange = { wcagSc: c.wcagSc, from: before, to: c.state };
    if (STATE_SEVERITY[c.state] > STATE_SEVERITY[before]) worsened.push(change);
    else improved.push(change);
  }
  const byCriterion = (a: CriterionChange, b: CriterionChange) =>
    a.wcagSc.localeCompare(b.wcagSc, undefined, { numeric: true });
  worsened.sort(byCriterion);
  improved.sort(byCriterion);

  return {
    hasPrevious: true,
    prevScanId: prev.id,
    prevDate: prev.createdAt,
    score: { current: cur.score, previous: prev.score },
    verdict: { current: cur.verdict, previous: prev.verdict },
    totalIssues: { current: curIssues, previous: prevIssues },
    pagesScanned: { current: cur.pagesScanned, previous: prev.pagesScanned },
    worsened,
    improved,
  };
}
