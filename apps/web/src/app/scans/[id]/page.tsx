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
import { AiReviewButton } from "@/components/AiReviewButton.js";
import { ReportViews } from "@/components/ReportViews.js";
import { EndUserView } from "@/components/EndUserView.js";
import { DeveloperView } from "@/components/DeveloperView.js";
import { computeCompleteness } from "@/lib/report-views.js";
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
  const naCount = criteria.filter((c) => c.state === "NOT_APPLICABLE").length;
  const completeness = computeCompleteness({ pass: passCount, fail: failCount, na: naCount, needsReview: manualCount });
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
        finishedAt={core.finishedAt}
        failCount={failCount}
        manualCount={manualCount}
        passCount={passCount}
        naCount={naCount}
        completeness={completeness}
      />

      <ExportBar scanId={core.id} />
      {session.user?.role === "ADMIN" && (
        <p><a className="btn" href={`/scans/${core.id}/review`}>Avvia revisione manuale</a></p>
      )}
      {session.user?.role === "ADMIN" && <AiReviewButton scanId={core.id} />}

      <ReportViews
        views={[
          {
            key: "summary",
            label: "Riepilogo",
            icon: "ℹ",
            panel: (
              <>
                <h2>Problemi principali</h2>
                <IssueSummary rules={rules} />

                <h2>Confronto con la scansione precedente</h2>
                <ComparisonCard cmp={cmp} />

                <h2>Pagine analizzate</h2>
                <PagesTable scanId={core.id} pages={pages} />

                <h2>Esito dei criteri ({criteria.length})</h2>
                <CriterionList rows={criteria} />
              </>
            ),
          },
          {
            key: "enduser",
            label: "Utente finale",
            icon: "👤",
            panel: <EndUserView rows={criteria} />,
          },
          {
            key: "developer",
            label: "Sviluppatore",
            icon: "</>",
            panel: <DeveloperView scanId={core.id} pages={pages} />,
          },
        ]}
      />
    </div>
  );
}
