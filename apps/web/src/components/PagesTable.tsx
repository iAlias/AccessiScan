"use client";
import { useId, useState } from "react";
import { SeverityChip } from "./SeverityChip.js";
import { formatInt, impactRank, type Impact } from "@/lib/format.js";

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
  failureSummary: string | null;
  occurrenceCount: number;
}

interface RuleGroup {
  ruleId: string;
  impact: Impact | null;
  help: string | null;
  failureSummary: string | null;
  occurrences: number;
  elements: number;
  selectors: string[];
}

const TOP_N = 25;
const MAX_SELECTORS = 5;

/** Collapse a page's raw issue rows into one entry per rule, like the report summary. */
function groupByRule(issues: PageIssue[]): RuleGroup[] {
  const map = new Map<string, RuleGroup>();
  for (const i of issues) {
    let g = map.get(i.ruleId);
    if (!g) {
      g = { ruleId: i.ruleId, impact: i.impact, help: i.help, failureSummary: i.failureSummary, occurrences: 0, elements: 0, selectors: [] };
      map.set(i.ruleId, g);
    }
    g.occurrences += i.occurrenceCount;
    g.elements += 1;
    if (g.selectors.length < MAX_SELECTORS) g.selectors.push(i.targetSelector);
  }
  return [...map.values()].sort(
    (a, b) => impactRank(a.impact) - impactRank(b.impact) || b.occurrences - a.occurrences || a.ruleId.localeCompare(b.ruleId),
  );
}

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

  const groups = issues ? groupByRule(issues) : null;
  // A perfectly clean page must read as visually empty; only failing pages get the visibility floor.
  const pct = page.issueCount === 0 || max === 0 ? 0 : Math.max(2, Math.round((page.issueCount / max) * 100));
  return (
    <li className="pages-table__row">
      <button
        type="button"
        className="pages-table__toggle"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${page.url}, ${formatInt(page.issueCount)} problemi`}
        onClick={toggle}
      >
        <span className="pages-table__url">{page.url}</span>
        <span className="pages-table__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
        <span className="pages-table__count">{formatInt(page.issueCount)}</span>
      </button>
      {open && (
        <div id={panelId} className="pages-table__detail">
          <div role="status" aria-live="polite">
            {loading && <p className="domain-card__meta">Caricamento…</p>}
            {!loading && error && <p className="domain-card__meta" role="alert">Errore nel caricamento dei problemi.</p>}
            {!loading && !error && groups && groups.length === 0 && (
              <p className="domain-card__meta">Nessun problema su questa pagina.</p>
            )}
          </div>
          {groups && groups.length > 0 && (
            <ul className="page-issues">
              {groups.map((g) => (
                <li key={g.ruleId} className="page-issues__item">
                  <SeverityChip impact={g.impact} />
                  <div className="page-issues__body">
                    <p className="page-issues__desc">
                      <code>{g.ruleId}</code>
                      {g.help ? ` — ${g.help}` : ""}
                    </p>
                    <p className="page-issues__meta">
                      {formatInt(g.occurrences)} occorrenze su {formatInt(g.elements)} {g.elements === 1 ? "elemento" : "elementi"}
                    </p>
                    {g.failureSummary && <p className="page-issues__why">{g.failureSummary}</p>}
                    <ul className="page-issues__selectors">
                      {g.selectors.map((s, idx) => (
                        <li key={idx}><code title={s}>{s}</code></li>
                      ))}
                      {g.elements > g.selectors.length && (
                        <li className="domain-card__meta">e altri {formatInt(g.elements - g.selectors.length)}</li>
                      )}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/** Sortable, paginated per-page issue counts with lazy, rule-grouped detail. */
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
