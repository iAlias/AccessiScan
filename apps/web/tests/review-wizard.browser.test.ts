import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { ReviewStepper } from "../src/components/ReviewStepper.js";

afterAll(async () => { await closeBrowser(); });

it("ReviewStepper has zero axe violations", async () => {
  const steps = [
    { id: 1, title: "Tastiera", pendingCount: 0 },
    { id: 2, title: "Screen reader", pendingCount: 3 },
    { id: 9, title: "Criteri residui", pendingCount: 1 },
  ];
  expect(await axeScanElement("Revisione", h(ReviewStepper, { steps, current: 2 }))).toEqual([]);
}, 60_000);
