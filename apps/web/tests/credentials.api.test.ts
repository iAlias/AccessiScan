import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import {
  handleCreateCredential, handleListCredentials, handleDeleteCredential,
} from "../src/app/api/domains/[id]/credentials/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

let seq = 0;
async function seedDomain() {
  seq += 1;
  const u = await prisma.user.create({ data: { email: `o${seq}@x.it`, name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

test("create 404 for unknown domain", async () => {
  const res = await handleCreateCredential("nope", { label: "email", secret: "s" });
  expect(res.status).toBe(404);
});

test("create rejects empty secret with 400", async () => {
  const d = await seedDomain();
  const res = await handleCreateCredential(d.id, { label: "email", secret: "" });
  expect(res.status).toBe(400);
});

test("create NEVER returns the secret or ciphertext", async () => {
  const d = await seedDomain();
  const res = await handleCreateCredential(d.id, { label: "email", secret: "super-secret-pw" });
  expect(res.status).toBe(201);
  const serialized = JSON.stringify(res.body);
  expect(serialized).not.toContain("super-secret-pw");
  const body = res.body as Record<string, unknown>;
  expect(body.ciphertext).toBeUndefined();
  expect(body.iv).toBeUndefined();
  expect(body.authTag).toBeUndefined();
  expect(body.wrappedDek).toBeUndefined();
  expect(body.label).toBe("email");
});

test("list returns metadata only, no secrets", async () => {
  const d = await seedDomain();
  await handleCreateCredential(d.id, { label: "email", secret: "secret-value-xyz" });
  const res = await handleListCredentials(d.id);
  expect(res.status).toBe(200);
  const serialized = JSON.stringify(res.body);
  expect(serialized).not.toContain("secret-value-xyz");
  expect((res.body as unknown[]).length).toBe(1);
});

test("delete is domain-scoped", async () => {
  const d1 = await seedDomain();
  const d2 = await seedDomain();
  const created = await handleCreateCredential(d1.id, { label: "email", secret: "s" });
  const credId = (created.body as { id: string }).id;

  // Wrong domain cannot delete
  expect((await handleDeleteCredential(d2.id, credId)).status).toBe(404);
  // Correct domain deletes
  expect((await handleDeleteCredential(d1.id, credId)).status).toBe(200);
  expect((await handleListCredentials(d1.id)).body as unknown[]).toHaveLength(0);
});
