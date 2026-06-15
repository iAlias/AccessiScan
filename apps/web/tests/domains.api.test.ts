import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleCreateDomain, handleListDomains } from "../src/app/api/projects/[id]/domains/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function projectId() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await prisma.project.create({ data: { name: "P", ownerId: u.id } });
  return p.id;
}

test("handleCreateDomain rejects non-http url", async () => {
  const res = await handleCreateDomain(await projectId(), { baseUrl: "ftp://x.it" });
  expect(res.status).toBe(400);
});

test("handleCreateDomain creates a domain and lists it", async () => {
  const id = await projectId();
  const created = await handleCreateDomain(id, { baseUrl: "https://www.pamacasa.it" });
  expect(created.status).toBe(201);
  const list = await handleListDomains(id);
  expect(list.body as unknown[]).toHaveLength(1);
});
