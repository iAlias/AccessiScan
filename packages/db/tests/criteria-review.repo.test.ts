import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, getReviewState, reviewCriterion } from "../src/index.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedScanWithCriteria(states: { wcagSc: string; state: "PASS" | "FAIL" | "NEEDS_MANUAL_REVIEW" }[]) {
  const u = await prisma.user.create({ data: { email: "rev@x.it", name: "R", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  await prisma.scan.update({ where: { id: scan.id }, data: { status: "DONE", verdict: "PARZIALMENTE" } });
  for (const s of states) await prisma.criterionResult.create({ data: { scanId: scan.id, wcagSc: s.wcagSc, state: s.state, source: "AUTOMATED" } });
  return { userId: u.id, scanId: scan.id };
}

test("getReviewState returns criteria + automatedBlockingFail flag", async () => {
  const { scanId } = await seedScanWithCriteria([{ wcagSc: "1.4.4", state: "NEEDS_MANUAL_REVIEW" }]);
  const st = await getReviewState(scanId);
  expect(st?.criteria).toHaveLength(1);
  expect(st?.automatedBlockingFail).toBe(false);
});

test("reviewCriterion PASS the only pending → verdict CONFORME, audited as MANUAL", async () => {
  const { userId, scanId } = await seedScanWithCriteria([{ wcagSc: "1.4.4", state: "NEEDS_MANUAL_REVIEW" }]);
  const res = await reviewCriterion({ scanId, wcagSc: "1.4.4", decision: "PASS", reviewerId: userId, note: "verificato a 200%" });
  expect(res.verdict).toBe("CONFORME");
  const cr = await prisma.criterionResult.findUnique({ where: { scanId_wcagSc: { scanId, wcagSc: "1.4.4" } } });
  expect(cr?.state).toBe("PASS");
  expect(cr?.source).toBe("MANUAL");
  expect(cr?.reviewerId).toBe(userId);
  expect(cr?.reviewNote).toBe("verificato a 200%");
  expect(cr?.reviewedAt).toBeTruthy();
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  expect(scan?.verdict).toBe("CONFORME");
});

test("reviewCriterion FAIL → verdict NON_CONFORME", async () => {
  const { userId, scanId } = await seedScanWithCriteria([{ wcagSc: "1.4.4", state: "NEEDS_MANUAL_REVIEW" }]);
  const res = await reviewCriterion({ scanId, wcagSc: "1.4.4", decision: "FAIL", reviewerId: userId });
  expect(res.verdict).toBe("NON_CONFORME");
});

test("reviewCriterion with a remaining pending → PARZIALMENTE", async () => {
  const { userId, scanId } = await seedScanWithCriteria([{ wcagSc: "1.4.4", state: "NEEDS_MANUAL_REVIEW" }, { wcagSc: "1.4.10", state: "NEEDS_MANUAL_REVIEW" }]);
  const res = await reviewCriterion({ scanId, wcagSc: "1.4.4", decision: "PASS", reviewerId: userId });
  expect(res.verdict).toBe("PARZIALMENTE");
});
