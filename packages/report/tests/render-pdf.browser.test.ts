import { afterAll, expect, it } from "vitest";
import { closeBrowser } from "@accessscan/scanner";
import { renderPdf } from "../src/render-pdf.js";
import { renderVpatHtml } from "../src/vpat-template.js";
import type { ReportModel } from "../src/report-model.js";

afterAll(async () => { await closeBrowser(); });

const model: ReportModel = {
  scanId: "s1", generatedAt: "2026-06-16T00:00:00.000Z",
  domain: { registrableDomain: "a.it", baseUrl: "https://a.it" },
  score: 42, verdict: "NON_CONFORME", coverageHeadline: 0.04, coverageTouched: 0.4, pagesScanned: 3, scanDate: null,
  criteria: [{ wcagSc: "1.4.3", en301549Clause: "9.1.4.3", state: "FAIL" }],
  issues: [], diff: null,
  versions: { wcag: "WCAG 2.1 AA", en: "EN 301 549 v3.2.1", axe: "4.11.4", playwright: "1.61.0" },
};

it("renderPdf produces a non-empty PDF buffer", async () => {
  const buf = await renderPdf(renderVpatHtml(model));
  expect(buf.length).toBeGreaterThan(1000);
  expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
}, 60_000);
