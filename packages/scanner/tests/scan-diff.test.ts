import { expect, test } from "vitest";
import { fingerprintIssue, computeScanDiff, type PersistedIssue } from "../src/scan-diff.js";

const mk = (over: Partial<PersistedIssue>): PersistedIssue => ({
  ruleId: "color-contrast", scId: "1.4.3", selector: "main > p:nth-child(3)", pageUrlPath: "/about", maxImpact: "serious", ...over,
});

test("fingerprint stable under nth-child/auto-id churn and impact change", () => {
  const a = fingerprintIssue(mk({ selector: "main > p:nth-child(3)", maxImpact: "serious" }));
  const b = fingerprintIssue(mk({ selector: "main > p:nth-child(7)", maxImpact: "critical" }));
  expect(a).toBe(b);
});
test("different ruleId or page or sc changes the fingerprint", () => {
  expect(fingerprintIssue(mk({}))).not.toBe(fingerprintIssue(mk({ ruleId: "image-alt" })));
  expect(fingerprintIssue(mk({}))).not.toBe(fingerprintIssue(mk({ pageUrlPath: "/contact" })));
});
test("computeScanDiff splits new/fixed/persistent + regressed", () => {
  const prev = [mk({ pageUrlPath: "/a", maxImpact: "minor" }), mk({ pageUrlPath: "/b" })];
  const curr = [mk({ pageUrlPath: "/a", maxImpact: "serious" }), mk({ pageUrlPath: "/c" })];
  const d = computeScanDiff(prev, curr);
  expect(d.counts).toEqual({ new: 1, fixed: 1, persistent: 1 });
  expect(d.regressed.length).toBe(1);
});
