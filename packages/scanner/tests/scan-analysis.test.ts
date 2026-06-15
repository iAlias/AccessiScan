import { expect, test } from "vitest";
import { buildScanAnalysis } from "../src/scan-analysis.js";
import type { CriterionFinding } from "../src/sc-mapping.js";

test("a blocking serious fail -> NON_CONFORME, with score and 50 states", () => {
  const perPage: CriterionFinding[][] = [[{ sc: "1.4.3", affectedNodes: 2, maxImpact: "serious" }]];
  const a = buildScanAnalysis({ perPageFindings: perPage, reviewSCs: new Set() });
  expect(a.verdict).toBe("NON_CONFORME");
  expect(a.siteScore).toBeGreaterThan(0);
  expect(a.siteScore).toBeLessThan(100);
  expect(a.states.size).toBe(50);
  expect(a.coverageRatio).toBeCloseTo(2 / 50);
  expect(a.counts.fail).toBeGreaterThanOrEqual(1);
});
test("clean automated run -> NON_DETERMINABILE, score 100, 2 PASS", () => {
  const a = buildScanAnalysis({ perPageFindings: [[]], reviewSCs: new Set() });
  expect(a.verdict).toBe("NON_DETERMINABILE");
  expect(a.siteScore).toBe(100);
  expect(a.counts.pass).toBe(2);
});
