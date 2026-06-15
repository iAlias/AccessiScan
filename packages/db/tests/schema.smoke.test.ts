import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "../src/client.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

test("can create a user and project and read them back", async () => {
  const user = await prisma.user.create({
    data: { email: "a@b.it", name: "Tester", passwordHash: "x", role: "ADMIN" },
  });
  const project = await prisma.project.create({
    data: { name: "Pam a Casa", ownerId: user.id },
  });
  const found = await prisma.project.findUnique({ where: { id: project.id } });
  expect(found?.name).toBe("Pam a Casa");
});
