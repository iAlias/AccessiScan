import { expect, test } from "vitest";
import { capturePageContext } from "../src/capture.js";

test("capturePageContext runs the URL validator (SSRF guard) before touching the browser", async () => {
  // The validator runs before browser.newContext, so a dummy browser is safe — it throws first.
  const dummyBrowser = {} as never;
  await expect(
    capturePageContext(dummyBrowser, "http://anything/", [], undefined, async () => { throw new Error("blocked by guard"); }),
  ).rejects.toThrow("blocked by guard");
});
