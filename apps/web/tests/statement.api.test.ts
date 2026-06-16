import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleGetStatement, handleDraftStatement, handlePutStatement } from "../src/app/api/domains/[id]/statement/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

test("get 404 when no statement", async () => {
  const d = await seedDomain();
  expect((await handleGetStatement(d.id)).status).toBe(404);
});

test("put rejects CONFORME", async () => {
  const d = await seedDomain();
  const res = await handlePutStatement(d.id, { conformanceStatus: "CONFORME", nonAccessibleContent: { inosservanzaL4_2004: [], onereSproporzionato: [], fuoriAmbito: [] } });
  expect(res.status).toBe(400);
});

test("put then get round-trips", async () => {
  const d = await seedDomain();
  const put = await handlePutStatement(d.id, { conformanceStatus: "PARZIALMENTE", nonAccessibleContent: { inosservanzaL4_2004: ["x"], onereSproporzionato: [], fuoriAmbito: [] }, feedbackContact: "a@b.it" });
  expect(put.status).toBe(200);
  const got = await handleGetStatement(d.id);
  expect((got.body as { conformanceStatus: string }).conformanceStatus).toBe("PARZIALMENTE");
});

test("draft 404 when no DONE scan, else proposes", async () => {
  const d = await seedDomain();
  expect((await handleDraftStatement(d.id)).status).toBe(404);
  const s = await createScan(d.id);
  await prisma.scan.update({ where: { id: s.id }, data: { status: "DONE", finishedAt: new Date() } });
  await prisma.criterionResult.create({ data: { scanId: s.id, wcagSc: "1.4.3", state: "FAIL" } });
  const res = await handleDraftStatement(d.id);
  expect(res.status).toBe(200);
  expect((res.body as { conformanceStatus: string }).conformanceStatus).toBe("NON_CONFORME");
});
