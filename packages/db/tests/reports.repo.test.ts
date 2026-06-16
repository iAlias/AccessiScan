import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, recordReport, listReports } from "../src/index.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedScan() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return createScan(d.id);
}

test("recordReport upserts one row per (scanId,type)", async () => {
  const s = await seedScan();
  await recordReport(s.id, "PDF", true, "/api/scans/x/report/pdf");
  await recordReport(s.id, "PDF", false, "/api/scans/x/report/pdf");
  const rows = await listReports(s.id);
  expect(rows.length).toBe(1);
  expect(rows[0]!.type).toBe("PDF");
  expect(rows[0]!.verapdfPassed).toBe(false);
});

test("different types create separate rows", async () => {
  const s = await seedScan();
  await recordReport(s.id, "PDF", null, "u");
  await recordReport(s.id, "CSV", null, "u");
  expect((await listReports(s.id)).length).toBe(2);
});
