import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "../src/client.js";
import { resetDb } from "./helpers/reset-db.js";
import { createProject, createDomain } from "../src/index.js";
import { createScan, persistPageWithIssues } from "../src/repositories/scans.js";
import { persistScanScoring, loadCurrentScanIssues } from "../src/repositories/scoring.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedScanWithIssue() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  await persistPageWithIssues(scan.id, { url: "https://a.it/about", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, [{
    ruleId: "color-contrast", wcagSc: "1.4.3", en301549Clause: "9.1.4.3", impact: "SERIOUS",
    help: "h", helpUrl: "u", htmlSnippet: "<p>x</p>", targetSelector: "main > p", failureSummary: "f", fingerprint: "fp",
  }]);
  return { domainId: d.id, scanId: scan.id };
}

const analysis = {
  siteScore: 96.4, pageScores: [96.4], verdict: "NON_CONFORME" as const, manualReviewLabel: false, coverageRatio: 2 / 50,
  counts: { pass: 2, fail: 1, needsReview: 47 },
  states: new Map<string, "PASS" | "FAIL" | "NEEDS_MANUAL_REVIEW">([["1.4.3", "FAIL"], ["2.4.2", "PASS"], ["1.2.1", "NEEDS_MANUAL_REVIEW"]]),
};

test("persistScanScoring writes Scan/Page/CriterionResult/ScoreHistory/ScanDiff", async () => {
  const { domainId, scanId } = await seedScanWithIssue();
  const curr = await loadCurrentScanIssues(scanId);
  await persistScanScoring({ scanId, domainId, analysis: analysis as never, prevIssues: [], currIssues: curr });

  const scan = await prisma.scan.findUnique({ where: { id: scanId }, include: { pages: true, criterionResults: true, scoreHistory: true, diff: true } });
  expect(scan?.score).toBeCloseTo(96.4);
  expect(scan?.verdict).toBe("NON_CONFORME");
  expect(scan?.coverageRatio).toBeCloseTo(2 / 50);
  expect(scan?.pages[0]?.pageScore).toBeCloseTo(96.4);
  expect(scan?.criterionResults.length).toBe(3);
  expect(scan?.criterionResults.find((c) => c.wcagSc === "1.4.3")?.state).toBe("FAIL");
  expect(scan?.scoreHistory?.failCount).toBe(1);
  expect(scan?.diff?.newIssueIds).toBeTruthy();
});

test("persistScanScoring is idempotent on CriterionResult", async () => {
  const { domainId, scanId } = await seedScanWithIssue();
  const curr = await loadCurrentScanIssues(scanId);
  await persistScanScoring({ scanId, domainId, analysis: analysis as never, prevIssues: [], currIssues: curr });
  await persistScanScoring({ scanId, domainId, analysis: analysis as never, prevIssues: [], currIssues: curr });
  const count = await prisma.criterionResult.count({ where: { scanId } });
  expect(count).toBe(3);
});
