import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, persistPageWithIssues, persistScanScoring, loadCurrentScanIssues, listReports } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleExportReport } from "../src/app/api/scans/[id]/report/[format]/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

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

test("404 for unknown scan", async () => {
  expect((await handleExportReport("nope", "json")).status).toBe(404);
});

test("400 for bad format", async () => {
  const id = await seedDoneScan();
  expect((await handleExportReport(id, "xml")).status).toBe(400);
});

test("json export returns content + records a Report row", async () => {
  const id = await seedDoneScan();
  const res = await handleExportReport(id, "json");
  expect(res.status).toBe(200);
  expect(res.contentType).toBe("application/json; charset=utf-8");
  expect(typeof res.body).toBe("string");
  expect(JSON.parse(res.body as string).scanId).toBe(id);
  expect((await listReports(id)).some((r) => r.type === "JSON")).toBe(true);
});

test("csv export returns text/csv", async () => {
  const id = await seedDoneScan();
  const res = await handleExportReport(id, "csv");
  expect(res.contentType).toBe("text/csv; charset=utf-8");
  expect((res.body as string).split("\n")[0]).toContain("pageUrl");
});
