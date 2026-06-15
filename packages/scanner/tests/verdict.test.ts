import { expect, test } from "vitest";
import { isBlockingViolation, computeCoverageRatio, deriveVerdict } from "../src/verdict.js";
import { WCAG_CATALOG } from "../src/wcag-catalog.js";

test("blocking = critical or serious", () => {
  expect(isBlockingViolation("serious")).toBe(true);
  expect(isBlockingViolation("critical")).toBe(true);
  expect(isBlockingViolation("moderate")).toBe(false);
  expect(isBlockingViolation("minor")).toBe(false);
});
test("coverageRatio = full/total = 2/50", () => {
  expect(computeCoverageRatio(WCAG_CATALOG)).toEqual({ ratio: 2 / 50, fullCount: 2, total: 50 });
});
test("verdict precedence; auto-clean run is NON_DETERMINABILE, never CONFORME", () => {
  expect(deriveVerdict({ blockingFailExists: true, anyFail: true, anyManualReview: true, coverageComplete: false }).verdict).toBe("NON_CONFORME");
  expect(deriveVerdict({ blockingFailExists: false, anyFail: true, anyManualReview: true, coverageComplete: false }).verdict).toBe("PARZIALMENTE");
  const review = deriveVerdict({ blockingFailExists: false, anyFail: false, anyManualReview: true, coverageComplete: false });
  expect(review.verdict).toBe("PARZIALMENTE");
  expect(review.manualReviewLabel).toBe(true);
  expect(deriveVerdict({ blockingFailExists: false, anyFail: false, anyManualReview: false, coverageComplete: false }).verdict).toBe("NON_DETERMINABILE");
  expect(deriveVerdict({ blockingFailExists: false, anyFail: false, anyManualReview: false, coverageComplete: true }).verdict).toBe("CONFORME");
});
