import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "../src/client.js";
import { resetDb } from "./helpers/reset-db.js";
import { createProject, listProjects, getProject } from "../src/repositories/projects.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedUser() {
  return prisma.user.create({
    data: { email: "owner@x.it", name: "Owner", passwordHash: "x", role: "ADMIN" },
  });
}

test("createProject stores and returns the project", async () => {
  const user = await seedUser();
  const p = await createProject({ name: "Pam", ownerId: user.id });
  expect(p.id).toBeTruthy();
  expect(p.name).toBe("Pam");
});

test("listProjects returns projects newest-first with domain count", async () => {
  const user = await seedUser();
  await createProject({ name: "First", ownerId: user.id });
  await createProject({ name: "Second", ownerId: user.id });
  const all = await listProjects();
  expect(all.map((p) => p.name)).toEqual(["Second", "First"]);
  expect(all[0]?._count.domains).toBe(0);
});

test("getProject returns null for unknown id", async () => {
  expect(await getProject("nope")).toBeNull();
});
