import { SeverityChip } from "./SeverityChip.js";
import { formatInt, type Impact } from "@/lib/format.js";
import { wcagTitle } from "@/lib/wcag-criteria.js";

export interface RuleRow {
  ruleId: string;
  wcagSc: string | null;
  impact: Impact | null;
  help: string | null;
  helpUrl: string | null;
  occurrences: number;
  affectedPages: number;
}

/** Aggregated "what is wrong and how widespread", sorted by severity. */
export function IssueSummary({ rules }: { rules: RuleRow[] }) {
  if (rules.length === 0) {
    return <p className="domain-card__meta">Nessun problema rilevato dai controlli automatici.</p>;
  }
  return (
    <>
    <p className="domain-card__meta issue-summary__lead">
      Aggregati per regola, ordinati per gravità. «Occorrenze» conta ogni elemento che fallisce.
    </p>
    <ul className="issue-summary">
      {rules.map((r) => {
        const title = r.wcagSc ? wcagTitle(r.wcagSc) : "";
        return (
          <li key={r.ruleId} className="issue-summary__row">
            <SeverityChip impact={r.impact} />
            <div className="issue-summary__body">
              <p className="issue-summary__title">
                <code>{r.ruleId}</code>
                {r.help ? ` — ${r.help}` : ""}
              </p>
              <p className="issue-summary__meta">
                {r.wcagSc ? <>Criterio {r.wcagSc}{title ? ` ${title}` : ""} · </> : null}
                {formatInt(r.affectedPages)} pagine colpite
                {r.helpUrl ? (
                  <>
                    {" · "}
                    <a href={r.helpUrl} target="_blank" rel="noreferrer">Come correggere</a>
                  </>
                ) : null}
              </p>
            </div>
            <span className="issue-summary__count">
              <strong>{formatInt(r.occurrences)}</strong>
              <span className="issue-summary__count-label">occorrenze</span>
            </span>
          </li>
        );
      })}
    </ul>
    </>
  );
}
