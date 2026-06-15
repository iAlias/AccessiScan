import { beforeEach, afterAll, expect, test, vi } from "vitest";
import { prisma, createProject, createDomain, createScan } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleTriggerScan, handleListScans, handleGetScan } from "../src/app/api/domains/[id]/scans/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

test("handleTriggerScan 404 for unknown domain", async () => {
  const res = await handleTriggerScan("nope", async () => {});
  expect(res.status).toBe(404);
});

test("handleTriggerScan creates a QUEUED scan, returns 202, fires runScan without awaiting", async () => {
  const d = await seedDomain();
  let resolved = false;
  const runScan = vi.fn(async () => { await new Promise((r) => setTimeout(r, 50)); resolved = true; });
  const res = await handleTriggerScan(d.id, runScan);
  expect(res.status).toBe(202);
  expect((res.body as { scanId: string }).scanId).toBeTruthy();
  expect(runScan).toHaveBeenCalledTimes(1);
  expect(resolved).toBe(false);
  const scan = await prisma.scan.findFirst({ where: { domainId: d.id } });
  expect(scan?.status).toBe("QUEUED");
});

test("handleListScans returns scans newest-first", async () => {
  const d = await seedDomain();
  await handleTriggerScan(d.id, async () => {});
  const res = await handleListScans(d.id);
  expect(res.status).toBe(200);
  expect((res.body as unknown[]).length).toBe(1);
});

test("handleGetScan returns a scan with its criterion results or 404", async () => {
  const d = await seedDomain();
  const scan = await createScan(d.id);
  const ok = await handleGetScan(scan.id);
  expect(ok.status).toBe(200);
  expect((ok.body as { id: string }).id).toBe(scan.id);
  const miss = await handleGetScan("nope");
  expect(miss.status).toBe(404);
});
