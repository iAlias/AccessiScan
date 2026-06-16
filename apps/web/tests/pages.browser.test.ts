import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { DomainCard } from "../src/components/DomainCard.js";
import { CriterionList } from "../src/components/CriterionList.js";
import { DiffSummary } from "../src/components/DiffSummary.js";

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
  const rows = Array.from({ length: 50 }, (_, i) => ({ wcagSc: `1.${i}.1`, en301549Clause: null, state: "NEEDS_MANUAL_REVIEW" as const }));
  const body = h("div", null,
    h("h2", null, "Confronto"),
    h(DiffSummary, { diff: { newIssueIds: ["x"], fixedIssueIds: [], persistentIssueIds: [] } }),
    h("h2", null, "Criteri"),
    h(CriterionList, { rows }),
  );
  expect(await axeScanElement("Report scansione", body)).toEqual([]);
}, 60_000);
