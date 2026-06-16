import { beforeEach, afterAll, expect, it } from "vitest";
import { prisma, createProject, createDomain, createScan, persistPageWithIssues, persistScanScoring, loadCurrentScanIssues } from "@accessscan/db";
import { closeBrowser } from "@accessscan/scanner";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleExportReport } from "../src/app/api/scans/[id]/report/[format]/handlers.js";

beforeEach(resetDb);
afterAll(async () => { await closeBrowser(); await prisma.$disconnect(); });

async function seedDoneScan() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  await persistPageWithIssues(scan.id, { url: "https://a.it/", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, [{
    ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS", help: "h", helpUrl: "u", htmlSnippet: "<p>x</p>", targetSelector: "p", failureSummary: "f", fingerprint: "fp",
  }]);
  const curr = await loadCurrentScanIssues(scan.id);
  await persistScanScoring({ scanId: scan.id, domainId: d.id, analysis: { siteScore: 50, pageScores: [50], verdict: "NON_CONFORME", manualReviewLabel: false, coverageRatio: 2 / 50, counts: { pass: 0, fail: 1, needsReview: 49 }, states: new Map([["1.4.3", "FAIL"]]) } as never, prevIssues: [], currIssues: curr });
  return scan.id;
}

it("pdf export returns a PDF buffer", async () => {
  const id = await seedDoneScan();
  const res = await handleExportReport(id, "pdf");
  expect(res.status).toBe(200);
  expect(res.contentType).toBe("application/pdf");
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect((res.body as Buffer).subarray(0, 5).toString("latin1")).toBe("%PDF-");
}, 60_000);
