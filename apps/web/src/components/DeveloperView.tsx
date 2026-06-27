"use client";
import { useId, useState } from "react";
import { IssueCodeCard, type CodeIssue } from "./IssueCodeCard.js";
import { formatInt, impactRank } from "@/lib/format.js";

export interface DevPageRow {
  id: string;
  url: string;
  issueCount: number;
}

const TOP_N = 25;

function PageRow({ scanId, page }: { scanId: string; page: DevPageRow }) {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<CodeIssue[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const panelId = useId();

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && issues === null && !loading) {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/scans/${scanId}/pages/${page.id}/issues`);
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { issues?: CodeIssue[] };
        const sorted = (data.issues ?? []).sort(
          (a, b) => impactRank(a.impact) - impactRank(b.impact) || a.ruleId.localeCompare(b.ruleId),
        );
        setIssues(sorted);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <li className="dev-view__page">
      <button
        type="button"
        className="pages-table__toggle"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${page.url}, ${formatInt(page.issueCount)} problemi`}
        onClick={toggle}
      >
        <span className="pages-table__url">{page.url}</span>
        <span className="pages-table__count">{formatInt(page.issueCount)}</span>
      </button>
      {open && (
        <div id={panelId} className="dev-view__cards">
          <div role="status" aria-live="polite">
            {loading && <p className="domain-card__meta">Caricamento…</p>}
            {!loading && error && <p className="domain-card__meta" role="alert">Errore nel caricamento dei problemi.</p>}
            {!loading && !error && issues && issues.length === 0 && (
              <p className="domain-card__meta">Nessun problema su questa pagina.</p>
            )}
          </div>
          {issues && issues.map((i) => <IssueCodeCard key={i.id} issue={i} />)}
        </div>
      )}
    </li>
  );
}

/**
 * Developer view: per-page, expandable list of issues rendered as code cards with
 * the offending HTML and WCAG/EN references. Lazily fetches issue detail on expand,
 * reusing the per-page issues endpoint.
 */
export function DeveloperView({ scanId, pages }: { scanId: string; pages: DevPageRow[] }) {
  const [showAll, setShowAll] = useState(false);
  if (pages.length === 0) return <p className="domain-card__meta">Nessuna pagina analizzata.</p>;

  const sorted = [...pages].sort((a, b) => b.issueCount - a.issueCount || a.url.localeCompare(b.url));
  const visible = showAll ? sorted : sorted.slice(0, TOP_N);

  return (
    <div className="dev-view">
      <p className="domain-card__meta">
        Espandi una pagina per vedere il codice degli elementi che falliscono, con riferimenti WCAG / EN 301 549.
      </p>
      <ul className="dev-view__list">
        {visible.map((p) => <PageRow key={p.id} scanId={scanId} page={p} />)}
      </ul>
      {!showAll && sorted.length > TOP_N && (
        <button type="button" className="btn btn--ghost" onClick={() => setShowAll(true)}>
          Mostra tutte le {formatInt(sorted.length)} pagine
        </button>
      )}
    </div>
  );
}
