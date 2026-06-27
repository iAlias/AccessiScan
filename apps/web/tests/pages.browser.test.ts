import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { DomainCard } from "../src/components/DomainCard.js";
import { CriterionList } from "../src/components/CriterionList.js";
import { ReportKpis } from "../src/components/ReportKpis.js";
import { IssueSummary } from "../src/components/IssueSummary.js";
import { ComparisonCard } from "../src/components/ComparisonCard.js";
import { PagesTable } from "../src/components/PagesTable.js";
import { ScanHistoryTable } from "../src/components/ScanHistoryTable.js";

afterAll(async () => { await closeBrowser(); });

it("overview composition: zero violations", async () => {
  const card = (id: string, score: number | null, verdict: "NON_CONFORME" | "PARZIALMENTE" | null) =>
    h(DomainCard, {
      data: { id, registrableDomain: `${id}.it`, trend: [],
        latestScan: { score, verdict, coverageRatio: 0.04, finishedAt: "2026-06-14T00:00:00Z" } },
      action: h("button", { className: "btn" }, "Avvia scansione"),
    });
  const grid = h("section", { "aria-label": "Progetto Demo" },
    h("h2", null, "Demo"),
    h("div", { className: "domain-grid" }, card("a", 42, "NON_CONFORME"), card("b", 71, "PARZIALMENTE"), card("c", null, null)),
  );
  expect(await axeScanElement("Panoramica", grid)).toEqual([]);
}, 60_000);

it("report composition: zero violations", async () => {
  const criteria = Array.from({ length: 50 }, (_, i) => ({ wcagSc: `1.${i}.1`, en301549Clause: null, state: "NEEDS_MANUAL_REVIEW" as const }));
  const rules = [
    { ruleId: "image-alt", wcagSc: "1.1.1", impact: "CRITICAL" as const, help: "Le immagini devono avere testo alternativo", helpUrl: "https://example.com/image-alt", occurrences: 3, affectedPages: 3 },
    { ruleId: "color-contrast", wcagSc: "1.4.3", impact: "SERIOUS" as const, help: "Contrasto insufficiente", helpUrl: "https://example.com/color-contrast", occurrences: 30847, affectedPages: 497 },
  ];
  const cmp = {
    hasPrevious: true, prevDate: "2026-06-01T00:00:00Z",
    score: { current: 79, previous: 79 },
    verdict: { current: "NON_CONFORME" as const, previous: "NON_CONFORME" as const },
    totalIssues: { current: 31227, previous: 32206 },
    pagesScanned: { current: 500, previous: 500 },
    worsened: [], improved: [],
  };
  const pages = [
    { id: "p1", url: "https://a.it/heavy", issueCount: 512 },
    { id: "p2", url: "https://a.it/light", issueCount: 0 },
  ];
  const body = h("div", null,
    h(ReportKpis, { score: 79, verdict: "NON_CONFORME", pagesScanned: 500, totalIssues: 31227, finishedAt: "2026-06-14T00:00:00Z", failCount: 7, manualCount: 43, passCount: 0, naCount: 0, completeness: 0.14 }),
    h("h2", null, "Problemi principali"),
    h(IssueSummary, { rules }),
    h("h2", null, "Confronto"),
    h(ComparisonCard, { cmp }),
    h("h2", null, "Pagine analizzate"),
    h(PagesTable, { scanId: "s1", pages }),
    h("h2", null, "Criteri"),
    h(CriterionList, { rows: criteria }),
  );
  expect(await axeScanElement("Report di accessibilità", body)).toEqual([]);
}, 60_000);

it("domain history table: zero violations", async () => {
  const scans = [
    { id: "s1", status: "DONE" as const, score: 79, verdict: "NON_CONFORME" as const, coverageRatio: 0.04, pagesScanned: 500, finishedAt: "2026-06-14T00:00:00Z", createdAt: "2026-06-14T00:00:00Z" },
    { id: "s2", status: "CANCELED" as const, score: null, verdict: null, coverageRatio: null, pagesScanned: 0, finishedAt: null, createdAt: "2026-06-13T00:00:00Z" },
  ];
  expect(await axeScanElement("Storico", h(ScanHistoryTable, { scans }))).toEqual([]);
}, 60_000);
