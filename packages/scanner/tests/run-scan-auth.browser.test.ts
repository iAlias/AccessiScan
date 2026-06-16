import { afterAll, beforeEach, expect, it } from "vitest";
import { prisma, createProject, createDomain, createCredential, upsertLoginRecipe } from "@accessscan/db";
import { resetDb } from "../../db/tests/helpers/reset-db.js";
import { runScan } from "../src/run-scan.js";
import { closeBrowser } from "../src/scanner.js";
import { startAuthedSiteServer, type AuthedSiteServer } from "./fixtures/authed-site-server.js";
import { assertChromiumInstalled } from "./fixtures/preflight.js";

let srv: AuthedSiteServer;
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await closeBrowser(); if (srv) await srv.close(); await prisma.$disconnect(); });

it("logs in, crawls behind the gate, and marks scanned pages AUTHED", async () => {
  assertChromiumInstalled();
  srv = await startAuthedSiteServer();
  const u = await prisma.user.create({ data: { email: "auth@x.it", name: "A", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "Auth", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: srv.base, crawlConfig: { sameDomainDelaySecs: 0, maxPages: 10 } });

  await createCredential({ domainId: d.id, label: "email", secret: "u@x.it" });
  await createCredential({ domainId: d.id, label: "password", secret: "pw" });
  await upsertLoginRecipe(d.id, {
    loginUrl: srv.url("/login"),
    steps: [
      { action: "fill", selector: 'input[name="email"]', valueRef: "email" },
      { action: "fill", selector: 'input[name="password"]', valueRef: "password" },
      { action: "click", selector: 'button[type="submit"]' },
    ],
    waitFor: { type: "selector", value: "#home" },
    successCheck: { type: "selector", value: "#home" },
  });

  const scan = await prisma.scan.create({ data: { domainId: d.id, status: "QUEUED" } });
  await runScan(scan.id);

  const done = await prisma.scan.findUnique({ where: { id: scan.id }, include: { pages: { include: { issues: true } } } });
  expect(done?.status).toBe("DONE");
  // Both gated pages (/ and /dashboard) are only reachable with the session.
  expect(done!.pages.length).toBeGreaterThanOrEqual(2);
  expect(done!.pages.every((pg) => pg.authState === "AUTHED")).toBe(true);
  // The protected dashboard's image-alt violation proves we scanned behind the gate.
  const ruleIds = done!.pages.flatMap((pg) => pg.issues.map((i) => i.ruleId));
  expect(ruleIds).toContain("image-alt");
}, 90_000);

it("marks pages ANON when no login recipe is configured", async () => {
  srv = await startAuthedSiteServer();
  const u = await prisma.user.create({ data: { email: "anon@x.it", name: "A", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "Anon", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: srv.base, crawlConfig: { sameDomainDelaySecs: 0, maxPages: 10 } });

  const scan = await prisma.scan.create({ data: { domainId: d.id, status: "QUEUED" } });
  await runScan(scan.id);

  const done = await prisma.scan.findUnique({ where: { id: scan.id }, include: { pages: true } });
  expect(done?.status).toBe("DONE");
  // Without auth, "/" redirects to /login; the only scannable page is the login page itself.
  expect(done!.pages.every((pg) => pg.authState === "ANON")).toBe(true);
}, 90_000);
