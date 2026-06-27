import { SeverityChip } from "./SeverityChip.js";
import { formatInt, safeExternalHref, type Impact } from "@/lib/format.js";
import { wcagTitle } from "@/lib/wcag-criteria.js";

export interface CodeIssue {
  id: string;
  ruleId: string;
  wcagSc: string | null;
  en301549Clause: string | null;
  impact: Impact | null;
  help: string | null;
  helpUrl: string | null;
  htmlSnippet: string | null;
  targetSelector: string;
  failureSummary: string | null;
  occurrenceCount: number;
}

/**
 * Developer-facing card for one issue: the offending HTML in context plus the
 * WCAG/EN references, CSS path and a fix link. Inspired by MAUVE++'s "Web
 * Developer" view (we annotate the element snippet, not the whole page source,
 * since AccessScan stores per-element snippets rather than full page HTML).
 */
export function IssueCodeCard({ issue }: { issue: CodeIssue }) {
  const title = issue.wcagSc ? wcagTitle(issue.wcagSc) : "";
  return (
    <article className="code-card">
      <header className="code-card__head">
        <SeverityChip impact={issue.impact} />
        <p className="code-card__title">
          <code>{issue.ruleId}</code>
          {issue.help ? ` — ${issue.help}` : ""}
        </p>
        <span className="code-card__count">
          {formatInt(issue.occurrenceCount)} {issue.occurrenceCount === 1 ? "occorrenza" : "occorrenze"}
        </span>
      </header>

      <ul className="code-card__badges">
        {issue.wcagSc && <li className="badge">WCAG {issue.wcagSc}{title ? ` · ${title}` : ""}</li>}
        {issue.en301549Clause && <li className="badge">EN {issue.en301549Clause}</li>}
      </ul>

      {issue.htmlSnippet ? (
        <pre className="code-card__snippet"><code>{issue.htmlSnippet}</code></pre>
      ) : (
        <p className="domain-card__meta">Snippet non disponibile.</p>
      )}

      <p className="code-card__selector">
        <span className="domain-card__meta">Selettore: </span>
        <code title={issue.targetSelector}>{issue.targetSelector}</code>
      </p>

      {issue.failureSummary && <p className="code-card__why">{issue.failureSummary}</p>}

      {safeExternalHref(issue.helpUrl) && (
        <p>
          <a href={safeExternalHref(issue.helpUrl)!} target="_blank" rel="noreferrer">Come correggere ↗</a>
        </p>
      )}
    </article>
  );
}
