import { expect, test } from "vitest";
import { renderVpatHtml } from "../src/vpat-template.js";
import type { ReportModel } from "../src/report-model.js";

const model: ReportModel = {
  scanId: "s1", generatedAt: "2026-06-16T00:00:00.000Z",
  domain: { registrableDomain: "a.it", baseUrl: "https://a.it" },
  score: 42, verdict: "NON_CONFORME", coverageHeadline: 0.04, coverageTouched: 0.4, pagesScanned: 3, scanDate: "2026-06-14T00:00:00.000Z",
  criteria: [{ wcagSc: "1.4.3", en301549Clause: "9.1.4.3", state: "FAIL" }, { wcagSc: "2.4.2", en301549Clause: "9.2.4.2", state: "PASS" }],
  issues: [{ pageUrl: "https://a.it/", ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS", targetSelector: "main p", help: "low contrast", helpUrl: "https://x", failureSummary: "f" }],
  diff: { newCount: 1, fixedCount: 0, persistentCount: 2 },
  versions: { wcag: "WCAG 2.1 AA", en: "EN 301 549 v3.2.1", axe: "4.11.4", playwright: "1.61.0" },
};

test("renderVpatHtml is a full lang=it doc with the 5 sections + pinned versions", () => {
  const html = renderVpatHtml(model);
  expect(html.startsWith("<!doctype html>")).toBe(true);
  expect(html).toContain('lang="it"');
  expect(html).toContain("Sintesi");
  expect(html).toContain("a.it");
  expect(html).toContain("1.4.3");
  expect(html).toContain("color-contrast");
  expect(html).toContain("Andamento");
  expect(html).toContain("WCAG 2.1 AA");
  expect(html).toContain("EN 301 549 v3.2.1");
  expect(html).toContain("4%");
});

test("renderVpatHtml prints the real verdict label (Non conforme), not a fabricated Conforme", () => {
  const html = renderVpatHtml(model);
  expect(html).toContain("Non conforme");
});
