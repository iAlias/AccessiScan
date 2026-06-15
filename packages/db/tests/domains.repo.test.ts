import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "../src/client.js";
import { resetDb } from "./helpers/reset-db.js";
import { createProject } from "../src/repositories/projects.js";
import { createDomain, listDomains, getDomain } from "../src/repositories/domains.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

let _seed = 0;
async function seedProject() {
  const user = await prisma.user.create({
    data: { email: `o${++_seed}@x.it`, name: "O", passwordHash: "x", role: "ADMIN" },
  });
  return createProject({ name: "P", ownerId: user.id });
}

test("createDomain derives registrableDomain and applies default crawl config", async () => {
  const project = await seedProject();
  const d = await createDomain({ projectId: project.id, baseUrl: "https://www.pamacasa.it" });
  expect(d.registrableDomain).toBe("pamacasa.it");
  expect((d.crawlConfig as { maxPages: number }).maxPages).toBe(500);
});

test("createDomain accepts a crawl config override", async () => {
  const project = await seedProject();
  const d = await createDomain({
    projectId: project.id,
    baseUrl: "https://www.pamacasa.it",
    crawlConfig: { maxPages: 50 },
  });
  expect((d.crawlConfig as { maxPages: number }).maxPages).toBe(50);
  expect((d.crawlConfig as { maxDepth: number }).maxDepth).toBe(4);
});

test("listDomains returns only the project's domains", async () => {
  const a = await seedProject();
  const b = await seedProject();
  await createDomain({ projectId: a.id, baseUrl: "https://a.example.com" });
  await createDomain({ projectId: b.id, baseUrl: "https://b.example.com" });
  const domains = await listDomains(a.id);
  expect(domains).toHaveLength(1);
  expect(domains[0]?.baseUrl).toBe("https://a.example.com");
});

test("getDomain returns null for unknown id", async () => {
  expect(await getDomain("nope")).toBeNull();
});
