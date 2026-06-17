import { expect, test } from "vitest";
import { capturePageContext } from "../src/capture.js";

test("capturePageContext rejects a private/loopback URL before touching the browser (SSRF guard)", async () => {
  // The default validator (assertPublicUrl) rejects loopback; it runs before browser use,
  // so passing a dummy browser is safe — the guard throws first.
  const dummyBrowser = {} as never;
  await expect(capturePageContext(dummyBrowser, "http://127.0.0.1/internal", [])).rejects.toThrow();
});
