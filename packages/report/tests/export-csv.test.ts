import { expect, test } from "vitest";
import { toCsv } from "../src/export-csv.js";
import type { ReportModel } from "../src/report-model.js";

const base = {
  scanId: "s1", generatedAt: "2026-06-16T00:00:00.000Z",
  domain: { registrableDomain: "a.it", baseUrl: "https://a.it" },
  score: 42, verdict: "NON_CONFORME", coverageHeadline: 0.04, coverageTouched: 0.4, pagesScanned: 3, scanDate: null,
  criteria: [{ wcagSc: "1.4.3", en301549Clause: "9.1.4.3", state: "FAIL" }],
  diff: null, versions: { wcag: "WCAG 2.1 AA", en: "EN 301 549 v3.2.1", axe: "4.11.4", playwright: "1.61.0" },
} as const;

test("toCsv emits a header and one row per issue", () => {
  const model = { ...base, issues: [{ pageUrl: "https://a.it/", ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS", targetSelector: "main p", help: "low contrast", helpUrl: "u", failureSummary: "f" }] } as unknown as ReportModel;
  const csv = toCsv(model);
  const lines = csv.trim().split("\n");
  expect(lines[0]).toBe("pageUrl,ruleId,wcagSc,en301549Clause,impact,targetSelector,help");
  expect(lines[1]).toContain("color-contrast");
});

test("toCsv quotes fields containing commas/quotes/newlines", () => {
  const model = { ...base, issues: [{ pageUrl: "https://a.it/", ruleId: "r", wcagSc: null, en301549Clause: null, impact: null, targetSelector: "a,b", help: 'say "hi"', helpUrl: null, failureSummary: null }] } as unknown as ReportModel;
  const csv = toCsv(model);
  expect(csv).toContain('"a,b"');
  expect(csv).toContain('"say ""hi"""');
});
