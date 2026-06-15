import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanUrl, closeBrowser } from "../src/scanner.js";
import { startFixtureServer, type FixtureServer } from "./fixtures/server.js";
import { assertChromiumInstalled } from "./fixtures/preflight.js";

let srv: FixtureServer;
beforeAll(async () => { assertChromiumInstalled(); srv = await startFixtureServer(); });
afterAll(async () => { await closeBrowser(); await srv.close(); });

describe("scanUrl", () => {
  it("reports image-alt on home", async () => {
    const { violations } = await scanUrl(srv.url("/"));
    expect(violations.map((v) => v.id)).toContain("image-alt");
  });
  it("reports color-contrast on about", async () => {
    const { violations } = await scanUrl(srv.url("/about"));
    expect(violations.map((v) => v.id)).toContain("color-contrast");
  });
  it("reports button-name on contact", async () => {
    const { violations } = await scanUrl(srv.url("/contact"));
    expect(violations.map((v) => v.id)).toContain("button-name");
  });
});
