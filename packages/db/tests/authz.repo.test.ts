import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan, projectOwnerId, domainOwnerId, scanOwnerId } from "../src/index.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function tenant(email: string) {
  const u = await prisma.user.create({ data: { email, name: email, passwordHash: "x", role: "MEMBER" } });
  const p = await createProject({ name: `P-${email}`, ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const s = await createScan(d.id);
  return { userId: u.id, projectId: p.id, domainId: d.id, scanId: s.id };
}

test("ownership resolvers map project/domain/scan to the owning user", async () => {
  const a = await tenant("a@x.it");
  const b = await tenant("b@x.it");

  expect(await projectOwnerId(a.projectId)).toBe(a.userId);
  expect(await domainOwnerId(a.domainId)).toBe(a.userId);
  expect(await scanOwnerId(a.scanId)).toBe(a.userId);

  // cross-tenant: B's resources never resolve to A
  expect(await scanOwnerId(b.scanId)).toBe(b.userId);
  expect(await scanOwnerId(b.scanId)).not.toBe(a.userId);
});

test("ownership resolvers return null for unknown ids", async () => {
  expect(await projectOwnerId("nope")).toBeNull();
  expect(await domainOwnerId("nope")).toBeNull();
  expect(await scanOwnerId("nope")).toBeNull();
});
