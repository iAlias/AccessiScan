import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "../src/client.js";
import { resetDb } from "./helpers/reset-db.js";
import { createProject, createDomain } from "../src/index.js";
import { upsertLoginRecipe, getLoginRecipe, deleteLoginRecipe } from "../src/repositories/login-recipes.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

const recipe = {
  loginUrl: "https://a.it/login",
  steps: [{ action: "fill" as const, selector: "#email", valueRef: "email" }, { action: "click" as const, selector: "button" }],
  waitFor: { type: "urlContains" as const, value: "/account" },
  successCheck: { type: "selector" as const, value: "#account" },
};

test("upsertLoginRecipe creates then updates without duplicating", async () => {
  const d = await seedDomain();
  await upsertLoginRecipe(d.id, recipe);
  await upsertLoginRecipe(d.id, { ...recipe, loginUrl: "https://a.it/signin" });
  const count = await prisma.loginRecipe.count({ where: { domainId: d.id } });
  expect(count).toBe(1);
  const got = await getLoginRecipe(d.id);
  expect(got?.loginUrl).toBe("https://a.it/signin");
  expect((got?.steps as unknown[]).length).toBe(2);
});

test("deleteLoginRecipe removes it", async () => {
  const d = await seedDomain();
  await upsertLoginRecipe(d.id, recipe);
  await deleteLoginRecipe(d.id);
  expect(await getLoginRecipe(d.id)).toBeNull();
});
