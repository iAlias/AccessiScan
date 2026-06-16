import { expect, test } from "vitest";
import { reviewDecisionSchema } from "@accessscan/validation";

test("accepts PASS/FAIL, optional note", () => {
  expect(reviewDecisionSchema.safeParse({ decision: "PASS" }).success).toBe(true);
  expect(reviewDecisionSchema.safeParse({ decision: "FAIL", note: "x" }).success).toBe(true);
});
test("rejects other decisions", () => {
  expect(reviewDecisionSchema.safeParse({ decision: "MAYBE" }).success).toBe(false);
});
