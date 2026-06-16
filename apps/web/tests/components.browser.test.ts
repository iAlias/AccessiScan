import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { ScoreRing } from "../src/components/ScoreRing.js";
import { VerdictPill } from "../src/components/VerdictPill.js";
import { ScanStatusBadge } from "../src/components/ScanStatusBadge.js";
import { DiffSummary } from "../src/components/DiffSummary.js";
import { TrendChart } from "../src/components/TrendChart.js";

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

it("TrendChart has zero violations (with and without data)", async () => {
  const withData = h(TrendChart, { points: [
    { score: 40, verdict: "NON_CONFORME", capturedAt: "2026-06-10T00:00:00Z" },
    { score: 55, verdict: "PARZIALMENTE", capturedAt: "2026-06-14T00:00:00Z" },
  ] });
  expect(await axeScanElement("Trend", withData)).toEqual([]);
  const empty = h(TrendChart, { points: [] });
  expect(await axeScanElement("Trend vuoto", empty)).toEqual([]);
}, 60_000);
