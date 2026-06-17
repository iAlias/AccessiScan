import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getReportCore, getIssuesByRule, getPageSummaries, getScanComparison, scanOwnerId,
} from "@accessscan/db";
import { requirePageSession } from "@/lib/require-session.js";
import { ReportKpis } from "@/components/ReportKpis.js";
import { IssueSummary } from "@/components/IssueSummary.js";
import { PagesTable } from "@/components/PagesTable.js";
import { ComparisonCard } from "@/components/ComparisonCard.js";
import { CriterionList } from "@/components/CriterionList.js";
import { ExportBar } from "@/components/ExportBar.js";
import { type CriterionState } from "@/lib/format.js";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession();
  const { id } = await params;
  if ((await scanOwnerId(id)) !== session.user!.id) notFound();
  const core = await getReportCore(id);
  if (!core) notFound();

  const [rules, pages, cmp] = await Promise.all([
    getIssuesByRule(id),
    getPageSummaries(id),
    getScanComparison(id),
  ]);

  const criteria = core.criterionResults
    .map((c) => ({ wcagSc: c.wcagSc, en301549Clause: c.en301549Clause, state: c.state as CriterionState }))
    .sort((a, b) => a.wcagSc.localeCompare(b.wcagSc, undefined, { numeric: true }));
  const failCount = criteria.filter((c) => c.state === "FAIL").length;
  const manualCount = criteria.filter((c) => c.state === "NEEDS_MANUAL_REVIEW").length;
  const passCount = criteria.filter((c) => c.state === "PASS").length;
  const totalIssues = pages.reduce((sum, p) => sum + p.issueCount, 0);

  return (
    <div className="container">
      <p className="domain-card__meta">
        <Link href={`/domains/${core.domain.id}`}>← {core.domain.registrableDomain}</Link>
        {" · "}Progetto {core.domain.project.name}
      </p>
      <h1>Report di accessibilità</h1>

      <ReportKpis
        score={core.score}
        verdict={core.verdict}
        pagesScanned={core.pagesScanned}
        totalIssues={totalIssues}
        coverageRatio={core.coverageRatio}
        finishedAt={core.finishedAt}
        failCount={failCount}
        manualCount={manualCount}
        passCount={passCount}
      />

      <ExportBar scanId={core.id} />
      {session.user?.role === "ADMIN" && (
        <p><a className="btn" href={`/scans/${core.id}/review`}>Avvia revisione manuale</a></p>
      )}

      <h2>Problemi principali</h2>
      <IssueSummary rules={rules} />

      <h2>Confronto con la scansione precedente</h2>
      <ComparisonCard cmp={cmp} />

      <h2>Pagine analizzate</h2>
      <PagesTable scanId={core.id} pages={pages} />

      <h2>Esito dei criteri ({criteria.length})</h2>
      <CriterionList rows={criteria} />
    </div>
  );
}
