import { criterionStateLabel, type CriterionState } from "@/lib/format.js";

export interface CriterionRow { wcagSc: string; en301549Clause: string | null; state: CriterionState }

export function CriterionList({ rows }: { rows: CriterionRow[] }) {
  return (
    <table className="criteria-table">
      <caption className="visually-hidden">Esito dei 50 criteri WCAG / EN 301 549</caption>
      <thead><tr><th scope="col">Criterio WCAG</th><th scope="col">Clausola EN</th><th scope="col">Esito</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.wcagSc}>
            <td>{r.wcagSc}</td>
            <td>{r.en301549Clause ?? "—"}</td>
            <td>{criterionStateLabel(r.state)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
