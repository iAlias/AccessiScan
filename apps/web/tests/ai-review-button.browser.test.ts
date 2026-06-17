import { afterAll, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const { AiReviewButton } = await import("../src/components/AiReviewButton.js");

afterAll(async () => { await closeBrowser(); });

it("AiReviewButton has zero axe violations", async () => {
  expect(await axeScanElement("AI", h(AiReviewButton, { scanId: "s1" }))).toEqual([]);
}, 60_000);
