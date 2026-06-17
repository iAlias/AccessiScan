import { expect, test } from "vitest";
import { aggregateSuggestions } from "../src/aggregate.js";
import type { CriterionVerdict } from "../src/types.js";

const v = (wcagSc: string, verdict: "PASS" | "FAIL" | "UNSURE", confidence: number, url = "u"): CriterionVerdict & { url: string } =>
  ({ wcagSc, verdict, confidence, reasoning: "r", evidenceSelector: "sel", url });

test("FAIL wins if any cluster fails the criterion", () => {
  const out = aggregateSuggestions([v("2.4.6", "PASS", 0.9), v("2.4.6", "FAIL", 0.8)], 0.7);
  expect(out).toHaveLength(1);
  expect(out[0]!.verdict).toBe("FAIL");
  expect(out[0]!.evidence).toBe("u — sel");
});

test("PASS only if all clusters pass with confidence >= threshold", () => {
  expect(aggregateSuggestions([v("2.4.6", "PASS", 0.9), v("2.4.6", "PASS", 0.95)], 0.7)[0]!.verdict).toBe("PASS");
  // a low-confidence pass downgrades the criterion to UNSURE
  expect(aggregateSuggestions([v("2.4.6", "PASS", 0.5)], 0.7)[0]!.verdict).toBe("UNSURE");
});

test("UNSURE if any cluster is unsure and none fail", () => {
  expect(aggregateSuggestions([v("2.4.6", "PASS", 0.9), v("2.4.6", "UNSURE", 0.4)], 0.7)[0]!.verdict).toBe("UNSURE");
});
