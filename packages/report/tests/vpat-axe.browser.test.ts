import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, expect, it } from "vitest";
import { scanUrl, closeBrowser } from "@accessscan/scanner";
import { renderVpatHtml } from "../src/vpat-template.js";
import type { ReportModel } from "../src/report-model.js";

afterAll(async () => { await closeBrowser(); });

const model: ReportModel = {
  scanId: "s1", generatedAt: "2026-06-16T00:00:00.000Z",
  domain: { registrableDomain: "a.it", baseUrl: "https://a.it" },
  score: 42, verdict: "NON_CONFORME", coverageHeadline: 0.04, coverageTouched: 0.4, pagesScanned: 3, scanDate: "2026-06-14T00:00:00.000Z",
  criteria: [{ wcagSc: "1.4.3", en301549Clause: "9.1.4.3", state: "FAIL" }, { wcagSc: "2.4.2", en301549Clause: "9.2.4.2", state: "PASS" }],
  issues: [{ pageUrl: "https://a.it/", ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS", targetSelector: "main p", help: "low contrast", helpUrl: "https://x", failureSummary: "f" }],
  diff: { newCount: 1, fixedCount: 0, persistentCount: 2 },
  versions: { wcag: "WCAG 2.1 AA", en: "EN 301 549 v3.2.1", axe: "4.11.4", playwright: "1.61.0" },
};

it("the VPAT report HTML has zero axe violations (dogfooding)", async () => {
  const html = renderVpatHtml(model);
  const server: Server = createServer((_req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(html); });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  try {
    const { violations } = await scanUrl(`http://127.0.0.1:${port}/`);
    expect(violations).toEqual([]);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}, 60_000);
