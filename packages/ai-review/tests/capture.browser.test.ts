import { afterAll, expect, test } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getBrowser, closeBrowser } from "@accessscan/scanner";
import { capturePageContext } from "../src/capture.js";

afterAll(() => closeBrowser());

test("capturePageContext returns a11y tree text + DOM excerpt for a live page", async () => {
  const html = `<!doctype html><html lang="it"><head><title>T</title></head><body><main><h1>Ciao</h1><button>Vai</button></main></body></html>`;
  const server = createServer((_q, r) => { r.writeHead(200, { "content-type": "text/html" }); r.end(html); });
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
  const { port } = server.address() as AddressInfo;
  try {
    const browser = await getBrowser();
    // inject a no-op URL validator: the test server is on loopback, which the real SSRF guard rejects
    const ctx = await capturePageContext(browser, `http://127.0.0.1:${port}/`, [], undefined, async () => {});
    expect(ctx.a11yTree).toContain("Vai");
    expect(ctx.domExcerpt).toContain("Ciao");
  } finally {
    await new Promise<void>((res) => server.close(() => res()));
  }
}, 60_000);
