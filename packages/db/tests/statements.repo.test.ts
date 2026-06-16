import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, getStatement, upsertStatement } from "../src/index.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

test("getStatement null when none; upsert then get", async () => {
  const d = await seedDomain();
  expect(await getStatement(d.id)).toBeNull();
  await upsertStatement(d.id, {
    conformanceStatus: "PARZIALMENTE", nonAccessibleContent: { inosservanzaL4_2004: ["x"], onereSproporzionato: [], fuoriAmbito: [] },
    method: "autovalutazione automatizzata", feedbackContact: "a@b.it", enforcementRoute: "AgID", lastUpdated: new Date(), nextReviewDue: new Date(),
  });
  const got = await getStatement(d.id);
  expect(got?.conformanceStatus).toBe("PARZIALMENTE");
  expect(got?.feedbackContact).toBe("a@b.it");
});

test("upsert twice updates the same row", async () => {
  const d = await seedDomain();
  const fields = { conformanceStatus: "PARZIALMENTE" as const, nonAccessibleContent: {}, method: "m", feedbackContact: null, enforcementRoute: null, lastUpdated: null, nextReviewDue: null };
  await upsertStatement(d.id, fields);
  await upsertStatement(d.id, { ...fields, conformanceStatus: "NON_CONFORME" });
  const all = await prisma.accessibilityStatement.findMany({ where: { domainId: d.id } });
  expect(all.length).toBe(1);
  expect(all[0]!.conformanceStatus).toBe("NON_CONFORME");
});
