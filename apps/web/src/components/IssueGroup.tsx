"use client";
import { useId, useState } from "react";

export interface IssueItem { id: string; ruleId: string; targetSelector: string; help: string | null }

export function IssueGroup({ pageUrl, issues }: { pageUrl: string; issues: IssueItem[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <section className="issue-group">
      <button className="issue-group__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {pageUrl} — {issues.length} problemi
      </button>
      {open && (
        <ul id={panelId}>
          {issues.map((i) => (
            <li key={i.id}><code>{i.ruleId}</code> — {i.help ?? ""} <code>{i.targetSelector}</code></li>
          ))}
        </ul>
      )}
    </section>
  );
}
