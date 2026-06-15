import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { executeLogin } from "../src/recipe-runner.js";
import { startAuthFixtureServer, type AuthFixtureServer } from "./fixtures/auth-server.js";
import { assertChromiumInstalled } from "./fixtures/preflight.js";

let srv: AuthFixtureServer;
let browser: Browser;
beforeAll(async () => { assertChromiumInstalled(); srv = await startAuthFixtureServer(); browser = await chromium.launch(); });
afterAll(async () => { await browser.close(); await srv.close(); });

const recipe = (srvUrl: (p: string) => string) => ({
  loginUrl: srvUrl("/login"),
  steps: [
    { action: "fill" as const, selector: 'input[name="email"]', valueRef: "email" },
    { action: "fill" as const, selector: 'input[name="password"]', valueRef: "password" },
    { action: "click" as const, selector: 'button[type="submit"]' },
  ],
  waitFor: { type: "urlContains" as const, value: "/account" },
  successCheck: { type: "selector" as const, value: "#account" },
});

it("logs in and captures the session cookie in storageState", async () => {
  const ss = await executeLogin(browser, recipe(srv.url), async (ref) => (ref === "email" ? "u@x.it" : "pw"));
  expect(ss.cookies.some((c) => c.name === "sid" && c.value === "ok")).toBe(true);
}, 60_000);

it("throws a redacted error when login fails (wrong success selector)", async () => {
  const bad = { ...recipe(srv.url), successCheck: { type: "selector" as const, value: "#nope" } };
  await expect(executeLogin(browser, bad, async () => "x")).rejects.toThrow(/successCheck/);
}, 60_000);
