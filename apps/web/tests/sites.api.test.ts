import { beforeEach, afterAll, expect, test, vi } from "vitest";
import { prisma } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleAddSite } from "../src/app/api/sites/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function owner() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  return u.id;
}

test("rejects a non-http url with 400", async () => {
  const res = await handleAddSite("ftp://x.it", await owner(), vi.fn());
  expect(res.status).toBe(400);
});

test("creates a default project + domain, fires a scan, returns 202 with ids", async () => {
  const ownerId = await owner();
  const runScan = vi.fn(async () => {});
  const res = await handleAddSite("https://www.pamacasa.it", ownerId, runScan);
  expect(res.status).toBe(202);
  const body = res.body as { domainId: string; scanId: string };
  expect(body.domainId).toBeTruthy();
  expect(body.scanId).toBeTruthy();
  expect(runScan).toHaveBeenCalledWith(body.scanId);
  // domain + a project were created for this owner
  const domain = await prisma.domain.findUnique({ where: { id: body.domainId }, include: { project: true } });
  expect(domain?.registrableDomain).toBe("pamacasa.it");
  expect(domain?.project.ownerId).toBe(ownerId);
});

test("reuses the owner's existing project instead of creating another", async () => {
  const ownerId = await owner();
  await prisma.project.create({ data: { name: "Esistente", ownerId } });
  await handleAddSite("https://a.it", ownerId, vi.fn());
  expect(await prisma.project.count({ where: { ownerId } })).toBe(1);
});
