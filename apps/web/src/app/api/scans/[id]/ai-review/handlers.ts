import { prisma, setAiReviewStatus, getAiSuggestions } from "@accessscan/db";
import type { HandlerResult } from "../../../projects/handlers.js";

export type AiRunner = (scanId: string) => Promise<void>;

export async function handleStartAiReview(scanId: string, runner: AiRunner): Promise<HandlerResult<unknown>> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { id: true } });
  if (!scan) return { status: 404, body: { error: "scan not found" } };
  // Atomic claim: transition to RUNNING only if not already RUNNING (closes the check-then-set race).
  const claimed = await prisma.scan.updateMany({
    where: { id: scanId, aiReviewStatus: { not: "RUNNING" } },
    data: { aiReviewStatus: "RUNNING", aiReviewCancelRequested: false, aiReviewError: null },
  });
  if (claimed.count === 0) return { status: 409, body: { error: "ai review already running" } };
  void runner(scanId).catch(async (e) => { await setAiReviewStatus(scanId, "FAILED", String(e)).catch(() => {}); });
  return { status: 202, body: { ok: true } };
}

export async function handleAiReviewStatus(scanId: string): Promise<HandlerResult<unknown>> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { aiReviewStatus: true, aiReviewError: true } });
  if (!scan) return { status: 404, body: { error: "scan not found" } };
  const suggestions = await getAiSuggestions(scanId);
  return { status: 200, body: { status: scan.aiReviewStatus, error: scan.aiReviewError, suggestions } };
}
