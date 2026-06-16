import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { ScoreRing } from "../src/components/ScoreRing.js";
import { VerdictPill } from "../src/components/VerdictPill.js";
import { ScanStatusBadge } from "../src/components/ScanStatusBadge.js";
import { DiffSummary } from "../src/components/DiffSummary.js";

afterAll(async () => { await closeBrowser(); });

it("harness: a clean paragraph has zero violations", async () => {
  const v = await axeScanElement("Test", h("p", null, "Ciao"));
  expect(v).toEqual([]);
}, 60_000);

it("ScoreRing/VerdictPill/StatusBadge/DiffSummary have zero violations", async () => {
  const group = h("div", null,
    h(ScoreRing, { score: 42 }),
    h(ScoreRing, { score: null }),
    h(VerdictPill, { verdict: "NON_CONFORME" }),
    h(VerdictPill, { verdict: null }),
    h(ScanStatusBadge, { status: "RUNNING" }),
    h(DiffSummary, { diff: { newIssueIds: ["a"], fixedIssueIds: [], persistentIssueIds: ["b", "c"] } }),
  );
  const v = await axeScanElement("Componenti", group);
  expect(v).toEqual([]);
}, 60_000);
