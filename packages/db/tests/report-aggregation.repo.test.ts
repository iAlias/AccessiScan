import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain } from "../src/index.js";
import { createScan, persistPageWithIssues, markScanDone, type IssueInput } from "../src/repositories/scans.js";
import {
  getIssuesByRule, getPageSummaries, getPageIssues, getScanComparison, getReportCore,
} from "../src/repositories/report-aggregation.js";
import type { Impact } from "@prisma/client";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain(email = "o@x.it") {
  const u = await prisma.user.create({ data: { email, name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return d.id;
}

function issue(ruleId: string, impact: Impact, fingerprint: string, wcagSc = "1.1.1"): IssueInput {
  return {
    ruleId, wcagSc, en301549Clause: "9.1.1.1", impact,
    help: `${ruleId} help`, helpUrl: `https://x/${ruleId}`,
    htmlSnippet: "<img>", targetSelector: `#${fingerprint}`,
    failureSummary: "fix it", fingerprint,
  };
}

const PAGE = { httpStatus: 200, depth: 0, discoveredVia: "BFS" as const };

test("getIssuesByRule aggregates occurrences + affected pages, severity-sorted", async () => {
  const domainId = await seedDomain();
  const scan = await createScan(domainId);
  // Page A: image-alt fp1 x2 (1 row, occ 2) + color-contrast fp2 x1
  await persistPageWithIssues(scan.id, { url: "https://a.it/a", ...PAGE }, [
    issue("image-alt", "CRITICAL", "fp1"),
    issue("image-alt", "CRITICAL", "fp1"),
    issue("color-contrast", "SERIOUS", "fp2", "1.4.3"),
  ]);
  // Page B: image-alt fp3 x1 (different fingerprint → distinct row, distinct page)
  await persistPageWithIssues(scan.id, { url: "https://a.it/b", ...PAGE }, [
    issue("image-alt", "CRITICAL", "fp3"),
  ]);

  const rules = await getIssuesByRule(scan.id);
  expect(rules.map((r) => r.ruleId)).toEqual(["image-alt", "color-contrast"]); // critical first
  const img = rules.find((r) => r.ruleId === "image-alt")!;
  expect(img.occurrences).toBe(3); // 2 + 1
  expect(img.affectedPages).toBe(2);
  expect(img.impact).toBe("CRITICAL");
  const cc = rules.find((r) => r.ruleId === "color-contrast")!;
  expect(cc.occurrences).toBe(1);
  expect(cc.affectedPages).toBe(1);
});

test("getPageSummaries returns pages worst-first with row counts", async () => {
  const domainId = await seedDomain();
  const scan = await createScan(domainId);
  await persistPageWithIssues(scan.id, { url: "https://a.it/light", ...PAGE }, [
    issue("image-alt", "CRITICAL", "x1"),
  ]);
  await persistPageWithIssues(scan.id, { url: "https://a.it/heavy", ...PAGE }, [
    issue("image-alt", "CRITICAL", "y1"),
    issue("color-contrast", "SERIOUS", "y2"),
    issue("link-name", "MODERATE", "y3"),
  ]);

  const pages = await getPageSummaries(scan.id);
  expect(pages.map((p) => p.url)).toEqual(["https://a.it/heavy", "https://a.it/light"]);
  expect(pages[0]!.issueCount).toBe(3);
  expect(pages[1]!.issueCount).toBe(1);
});

test("getPageIssues returns that page's issues, severity-sorted", async () => {
  const domainId = await seedDomain();
  const scan = await createScan(domainId);
  await persistPageWithIssues(scan.id, { url: "https://a.it/p", ...PAGE }, [
    issue("link-name", "MODERATE", "m1"),
    issue("image-alt", "CRITICAL", "c1"),
  ]);
  const page = (await getPageSummaries(scan.id))[0]!;
  const issues = await getPageIssues(scan.id, page.id);
  expect(issues.map((i) => i.ruleId)).toEqual(["image-alt", "link-name"]); // critical before moderate
});

test("getScanComparison reports deltas vs previous DONE scan", async () => {
  const domainId = await seedDomain();
  // previous scan: score 80, 2 issues, 2.4.2 PASS, 1.1.1 FAIL
  const prev = await createScan(domainId);
  await persistPageWithIssues(prev.id, { url: "https://a.it/x", ...PAGE }, [
    issue("image-alt", "CRITICAL", "p1"),
    issue("color-contrast", "SERIOUS", "p2"),
  ]);
  await prisma.criterionResult.createMany({ data: [
    { scanId: prev.id, wcagSc: "2.4.2", state: "PASS" },
    { scanId: prev.id, wcagSc: "1.1.1", state: "FAIL" },
  ] });
  await markScanDone(prev.id, 1);
  await prisma.scan.update({ where: { id: prev.id }, data: { score: 80, verdict: "PARZIALMENTE", createdAt: new Date("2026-06-01T00:00:00Z") } });

  // current scan: score 70, 3 issues, 2.4.2 FAIL (worsened), 1.1.1 PASS (improved)
  const cur = await createScan(domainId);
  await persistPageWithIssues(cur.id, { url: "https://a.it/y", ...PAGE }, [
    issue("image-alt", "CRITICAL", "c1"),
    issue("color-contrast", "SERIOUS", "c2"),
    issue("link-name", "MODERATE", "c3"),
  ]);
  await prisma.criterionResult.createMany({ data: [
    { scanId: cur.id, wcagSc: "2.4.2", state: "FAIL" },
    { scanId: cur.id, wcagSc: "1.1.1", state: "PASS" },
  ] });
  await markScanDone(cur.id, 1);
  await prisma.scan.update({ where: { id: cur.id }, data: { score: 70, verdict: "NON_CONFORME", createdAt: new Date("2026-06-10T00:00:00Z") } });

  const cmp = await getScanComparison(cur.id);
  expect(cmp.hasPrevious).toBe(true);
  expect(cmp.prevScanId).toBe(prev.id);
  expect(cmp.score).toEqual({ current: 70, previous: 80 });
  expect(cmp.totalIssues).toEqual({ current: 3, previous: 2 });
  expect(cmp.worsened.map((c) => c.wcagSc)).toEqual(["2.4.2"]);
  expect(cmp.improved.map((c) => c.wcagSc)).toEqual(["1.1.1"]);
});

test("getScanComparison has no previous for a first scan", async () => {
  const domainId = await seedDomain();
  const scan = await createScan(domainId);
  await persistPageWithIssues(scan.id, { url: "https://a.it/z", ...PAGE }, [issue("image-alt", "CRITICAL", "z1")]);
  await markScanDone(scan.id, 1);
  const cmp = await getScanComparison(scan.id);
  expect(cmp.hasPrevious).toBe(false);
  expect(cmp.totalIssues.current).toBe(1);
});

test("getReportCore returns header + criteria without issue dump", async () => {
  const domainId = await seedDomain();
  const scan = await createScan(domainId);
  await prisma.criterionResult.create({ data: { scanId: scan.id, wcagSc: "1.1.1", state: "FAIL" } });
  const core = await getReportCore(scan.id);
  expect(core?.domain.registrableDomain).toBe("a.it");
  expect(core?.criterionResults).toHaveLength(1);
  expect(core).not.toHaveProperty("pages");
});
