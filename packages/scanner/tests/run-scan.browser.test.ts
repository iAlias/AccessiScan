import { afterAll, beforeEach, expect, it } from "vitest";
import { prisma, createProject, createDomain } from "@accessscan/db";
import { resetDb } from "../../db/tests/helpers/reset-db.js";
import { runScan } from "../src/run-scan.js";
import { closeBrowser } from "../src/scanner.js";
import { startFixtureServer, type FixtureServer } from "./fixtures/server.js";
import { assertChromiumInstalled } from "./fixtures/preflight.js";

let srv: FixtureServer;
beforeEach(async () => { await resetDb(); });
afterAll(async () => { await closeBrowser(); if (srv) await srv.close(); await prisma.$disconnect(); });

it("runs a full scan over the fixture site and persists issues", async () => {
  assertChromiumInstalled();
  srv = await startFixtureServer();
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: srv.base, crawlConfig: { sameDomainDelaySecs: 0, maxPages: 10 } });
  const scan = await prisma.scan.create({ data: { domainId: d.id, status: "QUEUED" } });

  await runScan(scan.id);

  const done = await prisma.scan.findUnique({ where: { id: scan.id }, include: { pages: { include: { issues: true } } } });
  expect(done?.status).toBe("DONE");
  expect(done?.pagesScanned).toBe(3);
  const ruleIds = done!.pages.flatMap((pg) => pg.issues.map((i) => i.ruleId));
  expect(ruleIds).toContain("image-alt");
  expect(ruleIds).toContain("button-name");
}, 90_000);

it("completes DONE and persists real page metadata", async () => {
  srv = await startFixtureServer();
  const u = await prisma.user.create({ data: { email: "o2@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P2", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: srv.base, crawlConfig: { sameDomainDelaySecs: 0, maxPages: 10 } });
  const scan = await prisma.scan.create({ data: { domainId: d.id, status: "QUEUED" } });
  await runScan(scan.id);
  const done = await prisma.scan.findUnique({ where: { id: scan.id }, include: { pages: true } });
  expect(done?.status).toBe("DONE");
  expect(done?.pagesScanned).toBe(done?.pages.length);
  expect(done?.pages.every((pg) => pg.discoveredVia === "BFS" || pg.discoveredVia === "SITEMAP")).toBe(true);
}, 90_000);
