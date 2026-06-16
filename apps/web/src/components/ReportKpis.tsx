import { ScoreRing } from "./ScoreRing.js";
import { VerdictPill } from "./VerdictPill.js";
import { coverageLabel, formatDate, formatInt, type Verdict } from "@/lib/format.js";

export interface ReportKpiData {
  score: number | null;
  verdict: Verdict | null;
  pagesScanned: number;
  totalIssues: number;
  coverageRatio: number | null;
  finishedAt: Date | string | null;
  failCount: number;
  manualCount: number;
  passCount: number;
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "fail" | "warn" | "ok" }) {
  return (
    <div className="kpi">
      <dt className="kpi__label">{label}</dt>
      <dd className={tone ? `kpi__value kpi__value--${tone}` : "kpi__value"}>{value}</dd>
    </div>
  );
}

/** Executive summary header: score + verdict + the numbers that matter. */
export function ReportKpis(d: ReportKpiData) {
  return (
    <section className="report-summary" aria-label="Sommario della scansione">
      <div className="report-summary__head">
        <ScoreRing score={d.score} />
        <div className="report-summary__verdict">
          <VerdictPill verdict={d.verdict} />
          <p className="domain-card__meta">Conclusa il {formatDate(d.finishedAt)}</p>
        </div>
      </div>
      <dl className="kpi-grid">
        <Kpi label="Pagine analizzate" value={formatInt(d.pagesScanned)} />
        <Kpi label="Problemi rilevati" value={formatInt(d.totalIssues)} />
        <Kpi label="Criteri falliti" value={String(d.failCount)} tone="fail" />
        <Kpi label="Da verificare" value={String(d.manualCount)} tone="warn" />
        <Kpi label="Criteri superati" value={String(d.passCount)} tone="ok" />
        <Kpi label="Copertura manuale" value={coverageLabel(d.coverageRatio)} />
      </dl>
    </section>
  );
}
