import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleGetScanStatus } from "../src/app/api/scans/[id]/status/handlers.js";
import { handleCancelScan } from "../src/app/api/scans/[id]/cancel/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedScan(status: "RUNNING" | "DONE" = "RUNNING") {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  await prisma.scan.update({ where: { id: scan.id }, data: { status, phase: "scan", pagesFound: 8, pagesScanned: 3, currentUrl: "https://a.it/x", startedAt: new Date() } });
  return scan.id;
}

test("status returns the live progress fields", async () => {
  const id = await seedScan("RUNNING");
  const res = await handleGetScanStatus(id);
  const b = res.body as Record<string, unknown>;
  expect(b.phase).toBe("scan");
  expect(b.pagesFound).toBe(8);
  expect(b.pagesScanned).toBe(3);
  expect(b.currentUrl).toBe("https://a.it/x");
  expect(b.startedAt).toBeTruthy();
});

test("cancel a RUNNING scan → 202 and sets cancelRequested", async () => {
  const id = await seedScan("RUNNING");
  const res = await handleCancelScan(id);
  expect(res.status).toBe(202);
  const s = await prisma.scan.findUnique({ where: { id } });
  expect(s?.cancelRequested).toBe(true);
});

test("cancel a DONE scan → 409", async () => {
  const id = await seedScan("DONE");
  expect((await handleCancelScan(id)).status).toBe(409);
});

test("cancel unknown scan → 404", async () => {
  expect((await handleCancelScan("nope")).status).toBe(404);
});
