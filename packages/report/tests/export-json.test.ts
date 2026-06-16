import { expect, test } from "vitest";
import { toJson } from "../src/export-json.js";
import type { ReportModel } from "../src/report-model.js";

const model: ReportModel = {
  scanId: "s1", generatedAt: "2026-06-16T00:00:00.000Z",
  domain: { registrableDomain: "a.it", baseUrl: "https://a.it" },
  score: 42, verdict: "NON_CONFORME", coverageHeadline: 0.04, coverageTouched: 0.4, pagesScanned: 3, scanDate: null,
  criteria: [{ wcagSc: "1.4.3", en301549Clause: "9.1.4.3", state: "FAIL" }],
  issues: [{ pageUrl: "https://a.it/", ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS", targetSelector: "p", help: "h", helpUrl: "u", failureSummary: "f" }],
  diff: null, versions: { wcag: "WCAG 2.1 AA", en: "EN 301 549 v3.2.1", axe: "4.11.4", playwright: "1.61.0" },
};

test("toJson round-trips the model", () => {
  const parsed = JSON.parse(toJson(model));
  expect(parsed.scanId).toBe("s1");
  expect(parsed.criteria[0].state).toBe("FAIL");
  expect(parsed.versions.en).toBe("EN 301 549 v3.2.1");
});
