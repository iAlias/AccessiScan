import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleGetReview, handleReviewCriterion } from "../src/app/api/scans/[id]/review/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seed() {
  const u = await prisma.user.create({ data: { email: "rev@x.it", name: "R", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  await prisma.scan.update({ where: { id: scan.id }, data: { status: "DONE", verdict: "PARZIALMENTE" } });
  await prisma.criterionResult.create({ data: { scanId: scan.id, wcagSc: "1.4.4", state: "NEEDS_MANUAL_REVIEW", source: "AUTOMATED" } });
  return { userId: u.id, scanId: scan.id };
}

test("get review 404 for unknown scan", async () => {
  expect((await handleGetReview("nope")).status).toBe(404);
});
test("get review returns steps + criteria + verdict", async () => {
  const { scanId } = await seed();
  const res = await handleGetReview(scanId);
  expect(res.status).toBe(200);
  const body = res.body as { steps: unknown[]; criteria: unknown[] };
  expect(body.steps).toHaveLength(9);
  expect(body.criteria).toHaveLength(1);
});
test("post decision 400 on bad body", async () => {
  const { userId, scanId } = await seed();
  expect((await handleReviewCriterion(scanId, "1.4.4", { decision: "MAYBE" }, userId)).status).toBe(400);
});
test("post PASS the only pending → CONFORME", async () => {
  const { userId, scanId } = await seed();
  const res = await handleReviewCriterion(scanId, "1.4.4", { decision: "PASS", note: "ok" }, userId);
  expect(res.status).toBe(200);
  expect((res.body as { verdict: string }).verdict).toBe("CONFORME");
});
test("post 404 for unknown criterion", async () => {
  const { userId, scanId } = await seed();
  expect((await handleReviewCriterion(scanId, "9.9.9", { decision: "PASS" }, userId)).status).toBe(404);
});
