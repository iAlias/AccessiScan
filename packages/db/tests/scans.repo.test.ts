import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "../src/client.js";
import { resetDb } from "./helpers/reset-db.js";
import { createDomain, createProject } from "../src/index.js";
import { createScan, markScanRunning, persistPageWithIssues, markScanDone, markScanFailed } from "../src/repositories/scans.js";
import type { AuthState } from "@prisma/client";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

const issue = {
  ruleId: "image-alt", wcagSc: "1.1.1", en301549Clause: "9.1.1.1", impact: "CRITICAL" as const,
  help: "h", helpUrl: "u", htmlSnippet: "<img>", targetSelector: "#a", failureSummary: "f", fingerprint: "fp1",
};

test("createScan starts QUEUED, lifecycle transitions work", async () => {
  const d = await seedDomain();
  const scan = await createScan(d.id);
  expect(scan.status).toBe("QUEUED");
  await markScanRunning(scan.id, { axe: "4.11.4" });
  await persistPageWithIssues(scan.id, { url: "https://a.it/", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, [issue]);
  await markScanDone(scan.id, 1);
  const done = await prisma.scan.findUnique({ where: { id: scan.id }, include: { pages: { include: { issues: true } } } });
  expect(done?.status).toBe("DONE");
  expect(done?.pagesScanned).toBe(1);
  expect(done?.pages[0]?.issues[0]?.ruleId).toBe("image-alt");
});

test("persistPageWithIssues dedupes identical fingerprints with occurrenceCount", async () => {
  const d = await seedDomain();
  const scan = await createScan(d.id);
  await persistPageWithIssues(scan.id, { url: "https://a.it/x", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, [issue, { ...issue }]);
  const page = await prisma.page.findFirst({ where: { scanId: scan.id }, include: { issues: true } });
  expect(page?.issues.length).toBe(1);
  expect(page?.issues[0]?.occurrenceCount).toBe(2);
});

test("markScanFailed sets FAILED", async () => {
  const d = await seedDomain();
  const scan = await createScan(d.id);
  await markScanFailed(scan.id);
  expect((await prisma.scan.findUnique({ where: { id: scan.id } }))?.status).toBe("FAILED");
});

test("markScanFailed never clobbers a DONE or CANCELED scan", async () => {
  const d = await seedDomain();
  const done = await createScan(d.id);
  await markScanDone(done.id, 1);
  await markScanFailed(done.id);
  expect((await prisma.scan.findUnique({ where: { id: done.id } }))?.status).toBe("DONE");

  const canceled = await createScan(d.id);
  await prisma.scan.update({ where: { id: canceled.id }, data: { status: "CANCELED" } });
  await markScanFailed(canceled.id);
  expect((await prisma.scan.findUnique({ where: { id: canceled.id } }))?.status).toBe("CANCELED");
});

test("persistPageWithIssues records authState (defaults ANON)", async () => {
  const d = await seedDomain();
  const scan = await createScan(d.id);
  await persistPageWithIssues(scan.id, { url: "https://a.it/acct", httpStatus: 200, depth: 0, discoveredVia: "BFS", authState: "AUTHED" as AuthState }, []);
  await persistPageWithIssues(scan.id, { url: "https://a.it/pub", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, []);
  const pages = await prisma.page.findMany({ where: { scanId: scan.id }, orderBy: { url: "asc" } });
  expect(pages.find((p) => p.url.endsWith("/acct"))?.authState).toBe("AUTHED");
  expect(pages.find((p) => p.url.endsWith("/pub"))?.authState).toBe("ANON");
});
