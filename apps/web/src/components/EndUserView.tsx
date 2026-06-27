import { CriterionStateBadge, type CriterionRow } from "./CriterionList.js";
import { groupCriteriaByPrinciple } from "@/lib/report-views.js";
import { wcagTitle } from "@/lib/wcag-criteria.js";

const PRINCIPLE_BLURB: Record<number, string> = {
  1: "I contenuti devono essere percepibili da tutti, anche da chi non vede o non sente.",
  2: "L'interfaccia deve essere utilizzabile, anche solo con la tastiera o con tempi più lunghi.",
  3: "Contenuti e funzionamento devono essere comprensibili e prevedibili.",
  4: "Il sito deve essere robusto e funzionare con le tecnologie assistive.",
};

/**
 * Stakeholder view for non-technical readers: criteria grouped by WCAG principle
 * with plain-language explanations, no selectors or source code. Mirrors MAUVE++'s
 * "end user" report.
 */
export function EndUserView({ rows }: { rows: CriterionRow[] }) {
  const groups = groupCriteriaByPrinciple(rows);
  const failing = rows.filter((r) => r.state === "FAIL").length;
  const toCheck = rows.filter((r) => r.state === "NEEDS_MANUAL_REVIEW").length;

  return (
    <section aria-label="Riepilogo per utenti non tecnici" className="enduser-view">
      <p className="enduser-view__lead">
        {failing === 0
          ? "I controlli automatici non hanno trovato barriere bloccanti."
          : `Sono state rilevate ${failing} ${failing === 1 ? "barriera" : "barriere"} che possono impedire l'uso del sito ad alcune persone.`}
        {toCheck > 0 && ` Altri ${toCheck} aspetti richiedono una verifica manuale.`}
      </p>

      {groups.map((g) => {
        const groupFail = g.rows.filter((r) => r.state === "FAIL").length;
        return (
          <article key={g.principle} className="enduser-view__principle">
            <h3>
              {g.label}
              <span className="enduser-view__pcount">
                {groupFail > 0 ? `${groupFail} da risolvere` : "nessun problema bloccante"}
              </span>
            </h3>
            <p className="domain-card__meta">{PRINCIPLE_BLURB[g.principle]}</p>
            <ul className="enduser-view__list">
              {g.rows.map((r) => (
                <li key={r.wcagSc} className="enduser-view__item">
                  <CriterionStateBadge state={r.state} />
                  <span>{wcagTitle(r.wcagSc) || `Criterio ${r.wcagSc}`}</span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
