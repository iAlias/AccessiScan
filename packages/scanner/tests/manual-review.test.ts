import { expect, test } from "vitest";
import { PROCEDURES, buildReviewSteps, recomputeVerdict } from "../src/manual-review.js";

test("PROCEDURES has the 8 holistic procedures with criteria", () => {
  expect(PROCEDURES).toHaveLength(8);
  expect(PROCEDURES[0]!.criteria).toContain("2.1.1");
  expect(PROCEDURES[1]!.criteria).toContain("1.1.1");
});

test("buildReviewSteps yields 8 procedures + a residual step covering uncovered pendings", () => {
  const pending = ["1.1.1", "2.1.1", "9.9.9"];
  const steps = buildReviewSteps(pending);
  expect(steps).toHaveLength(9);
  expect(steps[8]!.title).toMatch(/residui/i);
  expect(steps[8]!.criteria).toEqual(["9.9.9"]);
  const all = new Set(steps.flatMap((s) => s.criteria));
  for (const sc of pending) expect(all.has(sc)).toBe(true);
});

test("recomputeVerdict: a manual FAIL is blocking → NON_CONFORME", () => {
  const r = recomputeVerdict({ criteria: [{ state: "FAIL", source: "MANUAL" }, { state: "PASS", source: "MANUAL" }], automatedBlockingFail: false });
  expect(r.verdict).toBe("NON_CONFORME");
});

test("recomputeVerdict: an automated non-blocking FAIL stays PARZIALMENTE (no regression)", () => {
  const r = recomputeVerdict({ criteria: [{ state: "FAIL", source: "AUTOMATED" }, { state: "PASS", source: "MANUAL" }], automatedBlockingFail: false });
  expect(r.verdict).toBe("PARZIALMENTE");
  expect(r.manualReviewLabel).toBe(false);
});

test("recomputeVerdict: automatedBlockingFail → NON_CONFORME", () => {
  const r = recomputeVerdict({ criteria: [{ state: "PASS", source: "AUTOMATED" }], automatedBlockingFail: true });
  expect(r.verdict).toBe("NON_CONFORME");
});

test("recomputeVerdict: a remaining NEEDS_MANUAL_REVIEW → PARZIALMENTE + label", () => {
  const r = recomputeVerdict({ criteria: [{ state: "NEEDS_MANUAL_REVIEW", source: "AUTOMATED" }, { state: "PASS", source: "MANUAL" }], automatedBlockingFail: false });
  expect(r.verdict).toBe("PARZIALMENTE");
  expect(r.manualReviewLabel).toBe(true);
});

test("recomputeVerdict: all PASS/NA, no fail, no pending → CONFORME", () => {
  const r = recomputeVerdict({ criteria: [{ state: "PASS", source: "MANUAL" }, { state: "NOT_APPLICABLE", source: "MANUAL" }], automatedBlockingFail: false });
  expect(r.verdict).toBe("CONFORME");
});
