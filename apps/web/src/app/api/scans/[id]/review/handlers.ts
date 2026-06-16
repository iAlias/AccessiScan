import { getReviewState, reviewCriterion } from "@accessscan/db";
import { buildReviewSteps } from "@accessscan/scanner";
import { reviewDecisionSchema } from "@accessscan/validation";
import type { HandlerResult } from "../../../projects/handlers.js";

export async function handleGetReview(scanId: string): Promise<HandlerResult<unknown>> {
  const state = await getReviewState(scanId);
  if (!state) return { status: 404, body: { error: "scan not found" } };
  const pending = state.criteria.filter((c) => c.state === "NEEDS_MANUAL_REVIEW").map((c) => c.wcagSc);
  const steps = buildReviewSteps(pending);
  return { status: 200, body: { verdict: state.verdict, automatedBlockingFail: state.automatedBlockingFail, criteria: state.criteria, steps } };
}

export async function handleReviewCriterion(scanId: string, wcagSc: string, input: unknown, reviewerId: string): Promise<HandlerResult<unknown>> {
  const parsed = reviewDecisionSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  const existing = await getReviewState(scanId);
  if (!existing) return { status: 404, body: { error: "scan not found" } };
  if (!existing.criteria.some((c) => c.wcagSc === wcagSc)) return { status: 404, body: { error: "criterion not found" } };
  const { verdict } = await reviewCriterion({ scanId, wcagSc, decision: parsed.data.decision, reviewerId, note: parsed.data.note });
  return { status: 200, body: { verdict } };
}
