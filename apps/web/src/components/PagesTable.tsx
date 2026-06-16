"use client";
import { useId, useState } from "react";
import { SeverityChip } from "./SeverityChip.js";
import { formatInt, type Impact } from "@/lib/format.js";

export interface PageRow {
  id: string;
  url: string;
  issueCount: number;
}

interface PageIssue {
  id: string;
  ruleId: string;
  wcagSc: string | null;
  impact: Impact | null;
  help: string | null;
  helpUrl: string | null;
  targetSelector: string;
  occurrenceCount: number;
}

const TOP_N = 25;

function PageRowItem({ scanId, page, max }: { scanId: string; page: PageRow; max: number }) {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<PageIssue[] | null>(null);
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
        const data = (await res.json()) as { issues?: PageIssue[] };
        setIssues(data.issues ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  const pct = max > 0 ? Math.max(2, Math.round((page.issueCount / max) * 100)) : 0;
  return (
    <li className="pages-table__row">
      <button
        type="button"
        className="pages-table__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${page.url}, ${page.issueCount} problemi`}
        onClick={toggle}
      >
        <span className="pages-table__url">{page.url}</span>
        <span className="pages-table__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
        <span className="pages-table__count">{formatInt(page.issueCount)}</span>
      </button>
      {open && (
        <div id={panelId} className="pages-table__detail">
          {loading && <p className="domain-card__meta">Caricamento…</p>}
          {error && <p className="domain-card__meta">Errore nel caricamento dei problemi.</p>}
          {issues && issues.length === 0 && <p className="domain-card__meta">Nessun problema su questa pagina.</p>}
          {issues && issues.length > 0 && (
            <ul className="page-issues">
              {issues.map((i) => (
                <li key={i.id} className="page-issues__item">
                  <SeverityChip impact={i.impact} />
                  <span className="page-issues__desc">
                    <code>{i.ruleId}</code>
                    {i.help ? ` — ${i.help}` : ""}
                  </span>
                  <code className="page-issues__sel">{i.targetSelector}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/** Sortable, paginated per-page issue counts with lazy detail expansion. */
export function PagesTable({ scanId, pages }: { scanId: string; pages: PageRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<"count" | "url">("count");

  if (pages.length === 0) return <p className="domain-card__meta">Nessuna pagina analizzata.</p>;

  const sorted = [...pages].sort((a, b) =>
    sort === "count"
      ? b.issueCount - a.issueCount || a.url.localeCompare(b.url)
      : a.url.localeCompare(b.url),
  );
  const max = Math.max(...pages.map((p) => p.issueCount), 0);
  const visible = showAll ? sorted : sorted.slice(0, TOP_N);

  return (
    <div className="pages-table">
      <div className="pages-table__toolbar">
        <span className="domain-card__meta">{formatInt(pages.length)} pagine</span>
        <span className="pages-table__sort">
          <span className="domain-card__meta">Ordina:</span>
          <button type="button" className={sort === "count" ? "linkish linkish--on" : "linkish"} aria-pressed={sort === "count"} onClick={() => setSort("count")}>problemi</button>
          <button type="button" className={sort === "url" ? "linkish linkish--on" : "linkish"} aria-pressed={sort === "url"} onClick={() => setSort("url")}>URL</button>
        </span>
      </div>
      <ul className="pages-table__list">
        {visible.map((p) => (
          <PageRowItem key={p.id} scanId={scanId} page={p} max={max} />
        ))}
      </ul>
      {!showAll && sorted.length > TOP_N && (
        <button type="button" className="btn btn--ghost" onClick={() => setShowAll(true)}>
          Mostra tutte le {formatInt(sorted.length)} pagine
        </button>
      )}
    </div>
  );
}
