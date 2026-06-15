import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "../src/client.js";
import { resetDb } from "./helpers/reset-db.js";
import { createProject, createDomain } from "../src/index.js";
import { createCredential, listCredentials, getCredentialSecret, resolveSecretsForDomain, deleteCredential } from "../src/repositories/credentials.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedDomain() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  return createDomain({ projectId: p.id, baseUrl: "https://a.it" });
}

test("createCredential stores ciphertext (never plaintext) and round-trips", async () => {
  const d = await seedDomain();
  const cred = await createCredential({ domainId: d.id, label: "email", secret: "user@site.it" });
  const row = await prisma.credential.findUnique({ where: { id: cred.id } });
  expect(row?.ciphertext).toBeTruthy();
  expect(row?.ciphertext).not.toContain("user@site.it");
  expect(await getCredentialSecret(cred.id)).toBe("user@site.it");
});

test("listCredentials returns metadata only (no secret/ciphertext)", async () => {
  const d = await seedDomain();
  await createCredential({ domainId: d.id, label: "pw", secret: "s3cret" });
  const list = await listCredentials(d.id);
  expect(list).toHaveLength(1);
  const keys = Object.keys(list[0]!);
  for (const forbidden of ["ciphertext", "iv", "authTag", "wrappedDek", "secret"]) {
    expect(keys).not.toContain(forbidden);
  }
  expect(list[0]!.label).toBe("pw");
});

test("resolveSecretsForDomain maps label->plaintext; deleteCredential removes", async () => {
  const d = await seedDomain();
  await createCredential({ domainId: d.id, label: "email", secret: "e@x.it" });
  const c2 = await createCredential({ domainId: d.id, label: "pw", secret: "pw1" });
  const map = await resolveSecretsForDomain(d.id);
  expect(map.get("email")).toBe("e@x.it");
  expect(map.get("pw")).toBe("pw1");
  await deleteCredential(c2.id);
  expect((await listCredentials(d.id)).map((c) => c.label)).toEqual(["email"]);
});

test("getCredentialSecret throws on tampered ciphertext", async () => {
  const d = await seedDomain();
  const cred = await createCredential({ domainId: d.id, label: "x", secret: "y" });
  await prisma.credential.update({ where: { id: cred.id }, data: { ciphertext: Buffer.from("tampered").toString("base64") } });
  await expect(getCredentialSecret(cred.id)).rejects.toThrow();
});
