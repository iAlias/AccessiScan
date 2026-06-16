import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { ScoreRing } from "../src/components/ScoreRing.js";
import { VerdictPill } from "../src/components/VerdictPill.js";
import { ScanStatusBadge } from "../src/components/ScanStatusBadge.js";
import { DiffSummary } from "../src/components/DiffSummary.js";
import { TrendChart } from "../src/components/TrendChart.js";
import { CriterionList } from "../src/components/CriterionList.js";
import { DomainCard } from "../src/components/DomainCard.js";

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

it("CriterionList has zero violations", async () => {
  const rows = [
    { wcagSc: "1.1.1", en301549Clause: "9.1.1.1", state: "NEEDS_MANUAL_REVIEW" as const },
    { wcagSc: "2.4.2", en301549Clause: "9.2.4.2", state: "PASS" as const },
    { wcagSc: "1.4.3", en301549Clause: null, state: "FAIL" as const },
  ];
  expect(await axeScanElement("Criteri", h(CriterionList, { rows }))).toEqual([]);
}, 60_000);

it("DomainCard has zero violations", async () => {
  const data = {
    id: "d1", registrableDomain: "pamacasa.it",
    latestScan: { score: 42, verdict: "NON_CONFORME" as const, coverageRatio: 0.04, finishedAt: "2026-06-14T00:00:00Z" },
    trend: [{ score: 40, verdict: "NON_CONFORME" as const, capturedAt: "2026-06-10T00:00:00Z" }],
  };
  const el = h(DomainCard, { data, action: h("button", { className: "btn" }, "Avvia scansione") });
  expect(await axeScanElement("Card", el)).toEqual([]);
}, 60_000);
