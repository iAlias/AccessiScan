import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, persistPageWithIssues, persistScanScoring, loadCurrentScanIssues } from "@accessscan/db";
import { resetDb } from "../../db/tests/helpers/reset-db.js";
import { buildReportModel } from "../src/report-data.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDoneScan() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  await prisma.scan.update({ where: { id: scan.id }, data: { engineVersions: { axe: "4.11.4", playwright: "1.61.0", profile: "wcag21aa-en301549" } } });
  await persistPageWithIssues(scan.id, { url: "https://a.it/about", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, [{
    ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS",
    help: "h", helpUrl: "u", htmlSnippet: "<p>x</p>", targetSelector: "main > p", failureSummary: "f", fingerprint: "fp",
  }]);
  const curr = await loadCurrentScanIssues(scan.id);
  await persistScanScoring({ scanId: scan.id, domainId: d.id, analysis: {
    siteScore: 96.4, pageScores: [96.4], verdict: "NON_CONFORME", manualReviewLabel: false, coverageRatio: 2 / 50,
    counts: { pass: 2, fail: 1, needsReview: 47 },
    states: new Map([["1.4.3", "FAIL"], ["2.4.2", "PASS"], ["1.2.1", "NEEDS_MANUAL_REVIEW"]]),
  } as never, prevIssues: [], currIssues: curr });
  return scan.id;
}

test("buildReportModel assembles normalized data", async () => {
  const scanId = await seedDoneScan();
  const m = await buildReportModel(scanId);
  expect(m).not.toBeNull();
  if (!m) throw new Error("null");
  expect(m.domain.registrableDomain).toBe("a.it");
  expect(m.verdict).toBe("NON_CONFORME");
  expect(m.coverageHeadline).toBeCloseTo(2 / 50);
  expect(m.coverageTouched).toBeCloseTo(0.4);
  expect(m.versions).toEqual({ wcag: "WCAG 2.1 AA", en: "EN 301 549 v3.2.1", axe: "4.11.4", playwright: "1.61.0" });
  expect(m.criteria.length).toBe(3);
  expect(m.issues.find((i) => i.ruleId === "color-contrast")?.pageUrl).toBe("https://a.it/about");
});

test("buildReportModel returns null for unknown scan", async () => {
  expect(await buildReportModel("nope")).toBeNull();
});
