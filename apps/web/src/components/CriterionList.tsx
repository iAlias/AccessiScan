import { criterionStateLabel, type CriterionState } from "@/lib/format.js";
import { criterionStateTone } from "@/lib/report-views.js";
import { wcagTitle } from "@/lib/wcag-criteria.js";

export interface CriterionRow { wcagSc: string; en301549Clause: string | null; state: CriterionState }

/** Colour-coded outcome badge (fail / warn / ok / muted), reused across views. */
export function CriterionStateBadge({ state }: { state: CriterionState }) {
  return (
    <span className={`state-badge state-badge--${criterionStateTone(state)}`}>
      {criterionStateLabel(state)}
    </span>
  );
}

export function CriterionList({ rows }: { rows: CriterionRow[] }) {
  return (
    <table className="criteria-table">
      <caption className="visually-hidden">Esito dei 50 criteri WCAG / EN 301 549</caption>
      <thead><tr><th scope="col">Criterio</th><th scope="col">Clausola EN</th><th scope="col">Esito</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.wcagSc}>
            <td><strong>{r.wcagSc}</strong>{wcagTitle(r.wcagSc) ? ` — ${wcagTitle(r.wcagSc)}` : ""}</td>
            <td>{r.en301549Clause ?? "—"}</td>
            <td><CriterionStateBadge state={r.state} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
