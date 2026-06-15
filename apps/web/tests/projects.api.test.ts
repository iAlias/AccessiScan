import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleCreateProject, handleListProjects } from "../src/app/api/projects/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function ownerId() {
  const u = await prisma.user.create({
    data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" },
  });
  return u.id;
}

test("handleCreateProject rejects invalid input with 400", async () => {
  const res = await handleCreateProject({ name: "" }, await ownerId());
  expect(res.status).toBe(400);
});

test("handleCreateProject creates and returns 201", async () => {
  const res = await handleCreateProject({ name: "Pam" }, await ownerId());
  expect(res.status).toBe(201);
  expect((res.body as { name: string }).name).toBe("Pam");
});

test("handleListProjects returns created projects", async () => {
  const owner = await ownerId();
  await handleCreateProject({ name: "Pam" }, owner);
  const res = await handleListProjects();
  expect(res.status).toBe(200);
  expect(res.body as unknown[]).toHaveLength(1);
});
