import { expect, test } from "vitest";
import { criterionVerdictSchema, aiVerdictSchema } from "../src/types.js";

test("aiVerdictSchema accepts a well-formed model verdict", () => {
  const ok = aiVerdictSchema.safeParse({
    verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.8, reasoning: "Headings descriptive", evidenceSelector: "h1" }],
  });
  expect(ok.success).toBe(true);
});

test("criterionVerdictSchema rejects an invalid verdict value", () => {
  const bad = criterionVerdictSchema.safeParse({ wcagSc: "2.4.6", verdict: "MAYBE", confidence: 0.5, reasoning: "x" });
  expect(bad.success).toBe(false);
});

test("confidence is clamped range 0..1", () => {
  const bad = criterionVerdictSchema.safeParse({ wcagSc: "2.4.6", verdict: "PASS", confidence: 1.5, reasoning: "x" });
  expect(bad.success).toBe(false);
});
