import type { AxeImpact } from "./sc-mapping.js";
import type { Automatability, SCId } from "./wcag-catalog.js";

export type Verdict = "CONFORME" | "PARZIALMENTE" | "NON_CONFORME" | "NON_DETERMINABILE";

const BLOCKING: ReadonlySet<AxeImpact> = new Set<AxeImpact>(["critical", "serious"]);
export function isBlockingViolation(maxImpact: AxeImpact): boolean {
  return BLOCKING.has(maxImpact);
}

export function computeCoverageRatio(
  catalog: ReadonlyArray<{ sc: SCId; automatability: Automatability }>,
): { ratio: number; fullCount: number; total: number } {
  const total = catalog.length;
  const fullCount = catalog.filter((c) => c.automatability === "full").length;
  return { ratio: total === 0 ? 0 : fullCount / total, fullCount, total };
}

export function deriveVerdict(input: {
  blockingFailExists: boolean;
  anyFail: boolean;
  anyManualReview: boolean;
  coverageComplete: boolean;
}): { verdict: Verdict; manualReviewLabel: boolean } {
  if (input.blockingFailExists) return { verdict: "NON_CONFORME", manualReviewLabel: false };
  if (input.anyFail) return { verdict: "PARZIALMENTE", manualReviewLabel: false };
  if (input.anyManualReview) return { verdict: "PARZIALMENTE", manualReviewLabel: true };
  if (input.coverageComplete) return { verdict: "CONFORME", manualReviewLabel: false };
  return { verdict: "NON_DETERMINABILE", manualReviewLabel: false };
}
