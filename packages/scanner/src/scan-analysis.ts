import { WCAG_CATALOG, type SCId } from "./wcag-catalog.js";
import type { CriterionFinding } from "./sc-mapping.js";
import { aggregateSiteFindings, computePageScore, computeSiteScore } from "./scoring.js";
import { deriveAllStates, type SCState } from "./criterion-states.js";
import { computeCoverageRatio, deriveVerdict, isBlockingViolation, type Verdict } from "./verdict.js";

export interface ScanAnalysis {
  siteScore: number;
  pageScores: number[];
  states: Map<SCId, Exclude<SCState, "NOT_APPLICABLE">>;
  verdict: Verdict;
  manualReviewLabel: boolean;
  coverageRatio: number;
  counts: { pass: number; fail: number; needsReview: number };
}

export function buildScanAnalysis(input: {
  perPageFindings: ReadonlyArray<readonly CriterionFinding[]>;
  reviewSCs: ReadonlySet<SCId>;
}): ScanAnalysis {
  const siteFindings = aggregateSiteFindings(input.perPageFindings);
  const failSCs = new Set<SCId>(siteFindings.map((f) => f.sc));
  const states = deriveAllStates(failSCs, input.reviewSCs);

  let pass = 0, fail = 0, needsReview = 0;
  for (const s of states.values()) {
    if (s === "PASS") pass += 1;
    else if (s === "FAIL") fail += 1;
    else needsReview += 1;
  }

  const blockingFailExists = siteFindings.some((f) => isBlockingViolation(f.maxImpact));
  const anyManualReview = input.reviewSCs.size > 0;
  const coverageComplete = needsReview === 0;
  const { verdict, manualReviewLabel } = deriveVerdict({
    blockingFailExists,
    anyFail: fail > 0,
    anyManualReview,
    coverageComplete,
  });

  return {
    siteScore: computeSiteScore(input.perPageFindings),
    pageScores: input.perPageFindings.map((p) => computePageScore(p)),
    states,
    verdict,
    manualReviewLabel,
    coverageRatio: computeCoverageRatio(WCAG_CATALOG).ratio,
    counts: { pass, fail, needsReview },
  };
}
