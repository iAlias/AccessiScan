import { afterAll, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { ReviewStepper } from "../src/components/ReviewStepper.js";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const { ReviewWizard } = await import("../src/components/ReviewWizard.js");

afterAll(async () => { await closeBrowser(); });

it("ReviewStepper has zero axe violations", async () => {
  const steps = [
    { id: 1, title: "Tastiera", pendingCount: 0 },
    { id: 2, title: "Screen reader", pendingCount: 3 },
    { id: 9, title: "Criteri residui", pendingCount: 1 },
  ];
  expect(await axeScanElement("Revisione", h(ReviewStepper, { steps, current: 2 }))).toEqual([]);
}, 60_000);

it("ReviewWizard with an AI suggestion has zero axe violations", async () => {
  const steps = [{ id: 1, title: "Intestazioni", instructions: "Verifica", criteria: ["2.4.6"] }];
  const initialCriteria = [
    { wcagSc: "2.4.6", state: "NEEDS_MANUAL_REVIEW" as const, source: "AUTOMATED", reviewNote: null,
      aiState: "FAIL" as const, aiReasoning: "intestazioni non descrittive", aiConfidence: 0.8, aiEvidence: "https://a.it — h2" },
  ];
  const el = h(ReviewWizard, { scanId: "s1", steps, initialCriteria, initialVerdict: "NON_CONFORME" as const });
  expect(await axeScanElement("Revisione manuale", el)).toEqual([]);
}, 60_000);
