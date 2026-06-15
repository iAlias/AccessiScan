import { expect, test } from "vitest";
import { scoreCriterion, computeScore, aggregateSiteFindings, computeSiteScore } from "../src/scoring.js";
import type { CriterionFinding } from "../src/sc-mapping.js";

test("scoreCriterion = impactWeight * densityFactor, capped 25", () => {
  expect(scoreCriterion({ sc: "1.4.3", affectedNodes: 1, maxImpact: "critical" })).toBeCloseTo(5.5);
  expect(scoreCriterion({ sc: "1.4.3", affectedNodes: 10, maxImpact: "critical" })).toBeCloseTo(10);
  expect(scoreCriterion({ sc: "x", affectedNodes: 100, maxImpact: "critical" })).toBeLessThanOrEqual(25);
});
test("computeScore deducts from 100 with K=0.6", () => {
  expect(computeScore([])).toBe(100);
  expect(computeScore([{ sc: "1.4.3", affectedNodes: 1, maxImpact: "critical" }])).toBeCloseTo(96.7);
});
test("aggregateSiteFindings unions by sc (sum nodes, max impact)", () => {
  const perPage: CriterionFinding[][] = [
    [{ sc: "1.4.3", affectedNodes: 2, maxImpact: "serious" }],
    [{ sc: "1.4.3", affectedNodes: 3, maxImpact: "critical" }, { sc: "4.1.2", affectedNodes: 1, maxImpact: "minor" }],
  ];
  const agg = aggregateSiteFindings(perPage).sort((a, b) => a.sc.localeCompare(b.sc));
  expect(agg).toEqual([
    { sc: "1.4.3", affectedNodes: 5, maxImpact: "critical" },
    { sc: "4.1.2", affectedNodes: 1, maxImpact: "minor" },
  ]);
});
test("site score is monotonic: adding a failing page never raises it", () => {
  const a = computeSiteScore([[{ sc: "1.4.3", affectedNodes: 1, maxImpact: "serious" }]]);
  const b = computeSiteScore([
    [{ sc: "1.4.3", affectedNodes: 1, maxImpact: "serious" }],
    [{ sc: "4.1.2", affectedNodes: 1, maxImpact: "critical" }],
  ]);
  expect(b).toBeLessThanOrEqual(a);
});
