import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, updateScanProgress, requestScanCancel, isScanCancelRequested, markScanCanceled, deleteDomain } from "../src/index.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedScan() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const scan = await createScan(d.id);
  return { domainId: d.id, scanId: scan.id };
}

test("updateScanProgress sets phase/pagesFound/pagesScanned/currentUrl", async () => {
  const { scanId } = await seedScan();
  await updateScanProgress(scanId, { phase: "scan", pagesFound: 10, pagesScanned: 3, currentUrl: "https://a.it/x" });
  const s = await prisma.scan.findUnique({ where: { id: scanId } });
  expect(s?.phase).toBe("scan");
  expect(s?.pagesFound).toBe(10);
  expect(s?.pagesScanned).toBe(3);
  expect(s?.currentUrl).toBe("https://a.it/x");
});

test("requestScanCancel + isScanCancelRequested", async () => {
  const { scanId } = await seedScan();
  expect(await isScanCancelRequested(scanId)).toBe(false);
  await requestScanCancel(scanId);
  expect(await isScanCancelRequested(scanId)).toBe(true);
});

test("isScanCancelRequested false for unknown scan", async () => {
  expect(await isScanCancelRequested("nope")).toBe(false);
});

test("markScanCanceled sets status CANCELED + finishedAt", async () => {
  const { scanId } = await seedScan();
  await markScanCanceled(scanId);
  const s = await prisma.scan.findUnique({ where: { id: scanId } });
  expect(s?.status).toBe("CANCELED");
  expect(s?.finishedAt).toBeTruthy();
});

test("deleteDomain removes the domain and its scans (cascade)", async () => {
  const { domainId, scanId } = await seedScan();
  await deleteDomain(domainId);
  expect(await prisma.domain.findUnique({ where: { id: domainId } })).toBeNull();
  expect(await prisma.scan.findUnique({ where: { id: scanId } })).toBeNull();
});
