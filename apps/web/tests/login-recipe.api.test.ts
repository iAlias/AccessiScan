import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import {
  handleUpsertLoginRecipe, handleGetLoginRecipe, handleDeleteLoginRecipe,
} from "../src/app/api/domains/[id]/login-recipe/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

const validRecipe = {
  loginUrl: "https://a.it/login",
  steps: [
    { action: "fill", selector: 'input[name="email"]', valueRef: "email" },
    { action: "click", selector: 'button[type="submit"]' },
  ],
  waitFor: { type: "selector", value: "#home" },
  successCheck: { type: "selector", value: "#home" },
};

test("upsert 404 for unknown domain", async () => {
  const res = await handleUpsertLoginRecipe("nope", validRecipe);
  expect(res.status).toBe(404);
});

test("upsert rejects invalid recipe with 400", async () => {
  const d = await seedDomain();
  const res = await handleUpsertLoginRecipe(d.id, { loginUrl: "ftp://x", steps: [] });
  expect(res.status).toBe(400);
});

test("upsert then get then delete", async () => {
  const d = await seedDomain();
  const up = await handleUpsertLoginRecipe(d.id, validRecipe);
  expect(up.status).toBe(200);

  const got = await handleGetLoginRecipe(d.id);
  expect(got.status).toBe(200);
  expect((got.body as { loginUrl: string }).loginUrl).toBe("https://a.it/login");

  const del = await handleDeleteLoginRecipe(d.id);
  expect(del.status).toBe(200);

  const after = await handleGetLoginRecipe(d.id);
  expect(after.status).toBe(404);
});

test("get/delete 404 when no recipe", async () => {
  const d = await seedDomain();
  expect((await handleGetLoginRecipe(d.id)).status).toBe(404);
  expect((await handleDeleteLoginRecipe(d.id)).status).toBe(404);
});
