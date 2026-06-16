import { prisma } from "../client.js";
import { recomputeVerdict, type ReviewSource } from "@accessscan/scanner";
import type { CriterionResult, Verdict } from "@prisma/client";

export interface ReviewState {
  scanId: string;
  verdict: Verdict | null;
  automatedBlockingFail: boolean;
  criteria: Pick<CriterionResult, "wcagSc" | "en301549Clause" | "state" | "source" | "reviewerId" | "reviewedAt" | "reviewNote">[];
}

async function hasBlockingFail(scanId: string): Promise<boolean> {
  const n = await prisma.issue.count({ where: { scanId, impact: { in: ["CRITICAL", "SERIOUS"] } } });
  return n > 0;
}

export async function getReviewState(scanId: string): Promise<ReviewState | null> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) return null;
  const criteria = await prisma.criterionResult.findMany({
    where: { scanId },
    select: { wcagSc: true, en301549Clause: true, state: true, source: true, reviewerId: true, reviewedAt: true, reviewNote: true },
    orderBy: { wcagSc: "asc" },
  });
  return { scanId, verdict: scan.verdict, automatedBlockingFail: await hasBlockingFail(scanId), criteria };
}

export async function reviewCriterion(input: {
  scanId: string; wcagSc: string; decision: "PASS" | "FAIL"; reviewerId: string; note?: string;
}): Promise<{ verdict: Verdict }> {
  const automatedBlockingFail = await hasBlockingFail(input.scanId);
  return prisma.$transaction(async (tx) => {
    await tx.criterionResult.update({
      where: { scanId_wcagSc: { scanId: input.scanId, wcagSc: input.wcagSc } },
      data: { state: input.decision, source: "MANUAL", reviewerId: input.reviewerId, reviewedAt: new Date(), reviewNote: input.note ?? null },
    });
    const rows = await tx.criterionResult.findMany({ where: { scanId: input.scanId }, select: { state: true, source: true } });
    const { verdict } = recomputeVerdict({
      criteria: rows.map((r) => ({ state: r.state, source: r.source as ReviewSource })),
      automatedBlockingFail,
    });
    await tx.scan.update({ where: { id: input.scanId }, data: { verdict } });
    return { verdict };
  });
}
