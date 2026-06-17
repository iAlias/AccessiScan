import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleStartAiReview, handleAiReviewStatus } from "../src/app/api/scans/[id]/ai-review/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function scanId() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return (await createScan(d.id)).id;
}

test("start returns 202 and a no-op runner is injected", async () => {
  const id = await scanId();
  const res = await handleStartAiReview(id, async () => {});
  expect(res.status).toBe(202);
});

test("status returns the current ai review status + suggestions", async () => {
  const id = await scanId();
  const res = await handleAiReviewStatus(id);
  expect(res.status).toBe(200);
  expect((res.body as { status: string }).status).toBe("IDLE");
});

test("start is 409 when already running", async () => {
  const id = await scanId();
  await prisma.scan.update({ where: { id }, data: { aiReviewStatus: "RUNNING" } });
  const res = await handleStartAiReview(id, async () => {});
  expect(res.status).toBe(409);
});
