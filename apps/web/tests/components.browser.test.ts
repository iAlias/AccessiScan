import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";

afterAll(async () => { await closeBrowser(); });

it("harness: a clean paragraph has zero violations", async () => {
  const v = await axeScanElement("Test", h("p", null, "Ciao"));
  expect(v).toEqual([]);
}, 60_000);
