import { afterAll, beforeAll, expect, test } from "vitest";
import { startFixtureServer, type FixtureServer } from "./fixtures/server.js";

let srv: FixtureServer;
beforeAll(async () => { srv = await startFixtureServer(); });
afterAll(async () => { await srv.close(); });

test("serves fixture pages and sitemap on 127.0.0.1", async () => {
  expect(srv.base).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  const home = await fetch(srv.url("/"));
  expect(home.status).toBe(200);
  expect(await home.text()).toContain("<img");
  const sm = await fetch(srv.url("/sitemap.xml"));
  expect((await sm.text())).toContain(`${srv.base}/about`);
  expect((await fetch(srv.url("/missing"))).status).toBe(404);
});
