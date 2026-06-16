import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, reviewCriterion } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedCleanScan(pending: string[]) {
  const u = await prisma.user.create({ data: { email: "rev@x.it", name: "R", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  await prisma.scan.update({ where: { id: scan.id }, data: { status: "DONE", verdict: "PARZIALMENTE" } });
  for (const sc of ["2.4.2", "3.1.1", "4.1.1"]) await prisma.criterionResult.create({ data: { scanId: scan.id, wcagSc: sc, state: "PASS", source: "AUTOMATED" } });
  for (const sc of pending) await prisma.criterionResult.create({ data: { scanId: scan.id, wcagSc: sc, state: "NEEDS_MANUAL_REVIEW", source: "AUTOMATED" } });
  return { userId: u.id, scanId: scan.id };
}

test("clearing every pending criterion PASS unlocks CONFORME; a FAIL blocks it", async () => {
  const pending = ["1.1.1", "1.4.4", "2.1.1"];
  const { userId, scanId } = await seedCleanScan(pending);
  let verdict = "PARZIALMENTE";
  for (const sc of pending) verdict = (await reviewCriterion({ scanId, wcagSc: sc, decision: "PASS", reviewerId: userId })).verdict;
  expect(verdict).toBe("CONFORME");
  const after = await reviewCriterion({ scanId, wcagSc: "1.1.1", decision: "FAIL", reviewerId: userId });
  expect(after.verdict).toBe("NON_CONFORME");
});
