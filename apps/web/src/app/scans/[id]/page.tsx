import { notFound } from "next/navigation";
import { getScanReport } from "@accessscan/db";
import { requireSession } from "@/lib/require-session.js";
import { ScoreRing } from "@/components/ScoreRing.js";
import { VerdictPill } from "@/components/VerdictPill.js";
import { CriterionList } from "@/components/CriterionList.js";
import { DiffSummary } from "@/components/DiffSummary.js";
import { IssueGroup } from "@/components/IssueGroup.js";
import { ExportBar } from "@/components/ExportBar.js";
import { coverageLabel, formatDate, type Verdict, type CriterionState } from "@/lib/format.js";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const scan = await getScanReport(id);
  if (!scan) notFound();
  const criteria = scan.criterionResults
    .map((c) => ({ wcagSc: c.wcagSc, en301549Clause: c.en301549Clause, state: c.state as CriterionState }))
    .sort((a, b) => a.wcagSc.localeCompare(b.wcagSc, undefined, { numeric: true }));
  return (
    <div className="container">
      <h1>Report scansione</h1>
      <div className="report-header">
        <ScoreRing score={scan.score} />
        <VerdictPill verdict={scan.verdict as Verdict | null} />
        <span className="domain-card__meta">
          Copertura {coverageLabel(scan.coverageRatio)} · {scan.pagesScanned} pagine · {formatDate(scan.finishedAt)}
        </span>
      </div>
      <ExportBar scanId={scan.id} />

      <h2>Confronto</h2>
      <DiffSummary diff={scan.diff} />

      <h2>Criteri ({criteria.length})</h2>
      <CriterionList rows={criteria} />

      <h2>Problemi per pagina</h2>
      {scan.pages.map((pg) => (
        <IssueGroup key={pg.id} pageUrl={pg.url}
          issues={pg.issues.map((i) => ({ id: i.id, ruleId: i.ruleId, targetSelector: i.targetSelector, help: i.help }))} />
      ))}
    </div>
  );
}
