import { prisma } from "../client.js";
import type { AiReviewStatus } from "@prisma/client";

export interface AiSuggestionInput {
  wcagSc: string;
  verdict: "PASS" | "FAIL" | "UNSURE";
  confidence: number;
  reasoning: string;
  evidence: string | null;
}

const VERDICT_TO_STATE = { PASS: "PASS", FAIL: "FAIL", UNSURE: "NEEDS_MANUAL_REVIEW" } as const;

/** Write AI suggestions onto existing CriterionResult rows. Never touches state/source. */
export async function persistAiSuggestions(scanId: string, suggestions: AiSuggestionInput[]): Promise<void> {
  const now = new Date();
  await prisma.$transaction(
    suggestions.map((s) =>
      prisma.criterionResult.updateMany({
        where: { scanId, wcagSc: s.wcagSc },
        data: {
          aiState: VERDICT_TO_STATE[s.verdict],
          aiReasoning: s.reasoning,
          aiConfidence: s.confidence,
          aiEvidence: s.evidence,
          aiReviewedAt: now,
        },
      }),
    ),
  );
}

/** Wipe all AI suggestions for a scan (called before a re-run so stale ones don't linger). */
export function clearAiSuggestions(scanId: string): Promise<unknown> {
  return prisma.criterionResult.updateMany({
    where: { scanId },
    data: { aiState: null, aiReasoning: null, aiConfidence: null, aiEvidence: null, aiReviewedAt: null },
  });
}

export function getAiSuggestions(scanId: string) {
  return prisma.criterionResult.findMany({
    where: { scanId, aiState: { not: null } },
    select: { wcagSc: true, aiState: true, aiReasoning: true, aiConfidence: true, aiEvidence: true },
  });
}

export async function pendingManualCriteria(scanId: string): Promise<string[]> {
  const rows = await prisma.criterionResult.findMany({ where: { scanId, state: "NEEDS_MANUAL_REVIEW" }, select: { wcagSc: true }, orderBy: { wcagSc: "asc" } });
  return rows.map((r) => r.wcagSc);
}

export async function getPageAxeFindings(pageId: string): Promise<Array<{ ruleId: string; impact: string | null; help: string | null; targetSelector: string }>> {
  const issues = await prisma.issue.findMany({ where: { pageId }, select: { ruleId: true, impact: true, help: true, targetSelector: true } });
  return issues.map((i) => ({ ruleId: i.ruleId, impact: i.impact, help: i.help, targetSelector: i.targetSelector }));
}

export async function loadScanPageRefs(scanId: string): Promise<Array<{ id: string; url: string; ruleIds: string[] }>> {
  const pages = await prisma.page.findMany({
    where: { scanId },
    select: { id: true, url: true, issues: { select: { ruleId: true } } },
  });
  return pages.map((p) => ({ id: p.id, url: p.url, ruleIds: [...new Set(p.issues.map((i) => i.ruleId))] }));
}

export function setAiReviewStatus(scanId: string, status: AiReviewStatus, error?: string | null): Promise<unknown> {
  return prisma.scan.update({ where: { id: scanId }, data: { aiReviewStatus: status, aiReviewError: error ?? null } });
}

export async function isAiReviewCancelRequested(scanId: string): Promise<boolean> {
  const s = await prisma.scan.findUnique({ where: { id: scanId }, select: { aiReviewCancelRequested: true } });
  return s?.aiReviewCancelRequested ?? false;
}

export function requestAiReviewCancel(scanId: string): Promise<unknown> {
  return prisma.scan.update({ where: { id: scanId }, data: { aiReviewCancelRequested: true } });
}
