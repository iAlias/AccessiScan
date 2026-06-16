import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleGetScanStatus } from "../src/app/api/scans/[id]/status/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedScan() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return createScan(d.id);
}

test("404 for unknown scan", async () => {
  expect((await handleGetScanStatus("nope")).status).toBe(404);
});

test("returns only light status fields", async () => {
  const s = await seedScan();
  const res = await handleGetScanStatus(s.id);
  expect(res.status).toBe(200);
  const body = res.body as Record<string, unknown>;
  expect(body).toEqual({ id: s.id, status: "QUEUED", score: null, verdict: null, finishedAt: null, pagesScanned: 0 });
  expect(body.pages).toBeUndefined();
  expect(body.criterionResults).toBeUndefined();
});
