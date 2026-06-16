import { verdictLabel, scoreLabel, formatInt, type Verdict, type CriterionState } from "@/lib/format.js";
import { wcagTitle } from "@/lib/wcag-criteria.js";

export interface CriterionChange {
  wcagSc: string;
  from: CriterionState;
  to: CriterionState;
}

export interface Comparison {
  hasPrevious: boolean;
  prevDate: Date | string | null;
  score: { current: number | null; previous: number | null };
  verdict: { current: Verdict | null; previous: Verdict | null };
  totalIssues: { current: number; previous: number };
  pagesScanned: { current: number; previous: number };
  worsened: CriterionChange[];
  improved: CriterionChange[];
}

function Arrow({ delta, betterWhen }: { delta: number; betterWhen: "higher" | "lower" }) {
  if (delta === 0) return <span className="delta delta--flat">invariato</span>;
  const good = betterWhen === "higher" ? delta > 0 : delta < 0;
  return (
    <span className={`delta delta--${good ? "good" : "bad"}`}>
      {delta > 0 ? "▲" : "▼"} {delta > 0 ? "+" : "−"}{formatInt(Math.abs(delta))}
    </span>
  );
}

const criterionText = (c: CriterionChange) => {
  const t = wcagTitle(c.wcagSc);
  return t ? `${c.wcagSc} ${t}` : c.wcagSc;
};

/** Human-readable comparison vs the previous completed scan. */
export function ComparisonCard({ cmp }: { cmp: Comparison }) {
  if (!cmp.hasPrevious) {
    return <p className="domain-card__meta">Prima scansione del sito: nessun confronto disponibile.</p>;
  }
  const scoreDelta = Math.round(cmp.score.current ?? 0) - Math.round(cmp.score.previous ?? 0);
  const issuesDelta = cmp.totalIssues.current - cmp.totalIssues.previous;
  const comparable = cmp.pagesScanned.current === cmp.pagesScanned.previous;
  const verdictChanged = cmp.verdict.previous !== cmp.verdict.current;

  return (
    <div className="comparison">
      <dl className="comparison__rows">
        <div className="comparison__row">
          <dt>Punteggio</dt>
          <dd>
            {scoreLabel(cmp.score.previous)} → <strong>{scoreLabel(cmp.score.current)}</strong>{" "}
            <Arrow delta={scoreDelta} betterWhen="higher" />
          </dd>
        </div>
        <div className="comparison__row">
          <dt>Esito</dt>
          <dd>
            {verdictChanged ? (
              <>{verdictLabel(cmp.verdict.previous)} → <strong>{verdictLabel(cmp.verdict.current)}</strong></>
            ) : (
              <>{verdictLabel(cmp.verdict.current)} <span className="delta delta--flat">invariato</span></>
            )}
          </dd>
        </div>
        <div className="comparison__row">
          <dt>Problemi totali</dt>
          <dd>
            <strong>{formatInt(cmp.totalIssues.current)}</strong>{" "}
            <span className="domain-card__meta">(era {formatInt(cmp.totalIssues.previous)})</span>{" "}
            {comparable
              ? <Arrow delta={issuesDelta} betterWhen="lower" />
              : <span className="delta delta--flat">non confrontabile</span>}
          </dd>
        </div>
      </dl>
      {cmp.worsened.length > 0 && (
        <p className="comparison__criteria comparison__criteria--bad">
          <strong>Criteri peggiorati:</strong> {cmp.worsened.map(criterionText).join(", ")}
        </p>
      )}
      {cmp.improved.length > 0 && (
        <p className="comparison__criteria comparison__criteria--good">
          <strong>Criteri migliorati:</strong> {cmp.improved.map(criterionText).join(", ")}
        </p>
      )}
      {!comparable && (
        <p className="domain-card__meta">
          Nota: scansioni di dimensioni diverse ({formatInt(cmp.pagesScanned.current)} pagine contro{" "}
          {formatInt(cmp.pagesScanned.previous)} precedenti); i totali non sono direttamente confrontabili.
        </p>
      )}
    </div>
  );
}
