import { beforeEach, afterAll, expect, test } from "vitest";
import {
  prisma, createProject, createDomain, createScan,
  getOverview, getDomainOverview, getScanReport,
} from "../src/index.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain(email = "o@x.it") {
  const u = await prisma.user.create({ data: { email, name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return { projectId: p.id, domainId: d.id, userId: u.id };
}

test("getOverview returns projects → domains → latest scan + trend", async () => {
  const { domainId, userId } = await seedDomain();
  const older = await createScan(domainId);
  await prisma.scan.update({ where: { id: older.id }, data: { status: "DONE", score: 40, verdict: "NON_CONFORME", coverageRatio: 0.04, finishedAt: new Date() } });
  await prisma.scoreHistory.create({ data: { domainId, scanId: older.id, score: 40, verdict: "NON_CONFORME", failCount: 5, needsReviewCount: 18, passCount: 2 } });
  const newer = await createScan(domainId);
  await prisma.scan.update({ where: { id: newer.id }, data: { status: "DONE", score: 55, verdict: "PARZIALMENTE", coverageRatio: 0.04, finishedAt: new Date() } });
  await prisma.scoreHistory.create({ data: { domainId, scanId: newer.id, score: 55, verdict: "PARZIALMENTE", failCount: 3, needsReviewCount: 18, passCount: 4 } });

  const overview = await getOverview(userId);
  expect(overview).toHaveLength(1);
  const dom = overview[0]!.domains[0]!;
  expect(dom.latestScan?.id).toBe(newer.id);
  expect(dom.latestScan?.score).toBe(55);
  expect(dom.trend.map((t) => t.score)).toEqual([40, 55]);
});

test("getOverview headlines the latest DONE scan, flags a non-DONE newest", async () => {
  const { domainId, userId } = await seedDomain();
  const done = await createScan(domainId);
  await prisma.scan.update({ where: { id: done.id }, data: { status: "DONE", score: 79, verdict: "NON_CONFORME", coverageRatio: 0.04, finishedAt: new Date("2026-06-01T00:00:00Z"), createdAt: new Date("2026-06-01T00:00:00Z") } });
  const canceled = await createScan(domainId);
  await prisma.scan.update({ where: { id: canceled.id }, data: { status: "CANCELED", createdAt: new Date("2026-06-02T00:00:00Z") } });

  const dom = (await getOverview(userId))[0]!.domains[0]!;
  expect(dom.latestScan?.id).toBe(done.id); // headline = last completed, not the cancelled one
  expect(dom.latestScan?.score).toBe(79);
  expect(dom.pendingStatus).toBe("CANCELED");
});

test("getOverview finds the latest DONE scan even behind 10+ newer non-DONE scans", async () => {
  const { domainId, userId } = await seedDomain();
  const done = await createScan(domainId);
  await prisma.scan.update({ where: { id: done.id }, data: { status: "DONE", score: 64, verdict: "PARZIALMENTE", finishedAt: new Date("2026-06-01T00:00:00Z"), createdAt: new Date("2026-06-01T00:00:00Z") } });
  for (let i = 0; i < 11; i++) {
    const c = await createScan(domainId);
    await prisma.scan.update({ where: { id: c.id }, data: { status: "CANCELED", createdAt: new Date(`2026-06-${String(2 + i).padStart(2, "0")}T00:00:00Z`) } });
  }
  const dom = (await getOverview(userId))[0]!.domains[0]!;
  expect(dom.latestScan?.id).toBe(done.id);
  expect(dom.latestScan?.score).toBe(64);
  expect(dom.pendingStatus).toBe("CANCELED");
});

test("getOverview handles a domain with no scans", async () => {
  const { userId } = await seedDomain();
  const overview = await getOverview(userId);
  expect(overview[0]!.domains[0]!.latestScan).toBeNull();
  expect(overview[0]!.domains[0]!.trend).toEqual([]);
});

test("getDomainOverview returns domain + project + scan list", async () => {
  const { domainId } = await seedDomain();
  const s = await createScan(domainId);
  await prisma.scan.update({ where: { id: s.id }, data: { status: "DONE", score: 70, verdict: "PARZIALMENTE" } });
  const res = await getDomainOverview(domainId);
  expect(res?.project.name).toBe("P");
  expect(res?.scans).toHaveLength(1);
  expect(res?.scans[0]!.score).toBe(70);
});

test("getScanReport includes criterionResults, diff, scoreHistory, pages.issues", async () => {
  const { domainId } = await seedDomain();
  const s = await createScan(domainId);
  const report = await getScanReport(s.id);
  expect(report?.id).toBe(s.id);
  expect(Array.isArray(report?.criterionResults)).toBe(true);
  expect(Array.isArray(report?.pages)).toBe(true);
});

test("getScanReport returns null for unknown id", async () => {
  expect(await getScanReport("nope")).toBeNull();
});
