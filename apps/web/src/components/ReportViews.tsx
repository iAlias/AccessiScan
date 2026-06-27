"use client";
import { useId, useRef, useState, type ReactNode, type KeyboardEvent } from "react";

export interface ReportView {
  key: string;
  label: string;
  icon?: string;
  panel: ReactNode;
}

/**
 * Multi-stakeholder report tabs (Summary / End user / Developer), inspired by
 * MAUVE++'s separate views. Server components render each panel and pass it in as
 * a node; this client wrapper only owns selection + keyboard navigation.
 * Implements the WAI-ARIA tabs pattern: roving tabindex, arrow/Home/End keys.
 */
export function ReportViews({ views }: { views: ReportView[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusTab(i: number) {
    const next = (i + views.length) % views.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); focusTab(i + 1); break;
      case "ArrowLeft": e.preventDefault(); focusTab(i - 1); break;
      case "Home": e.preventDefault(); focusTab(0); break;
      case "End": e.preventDefault(); focusTab(views.length - 1); break;
    }
  }

  return (
    <div className="report-views">
      <div role="tablist" aria-label="Viste del report" className="report-views__tabs">
        {views.map((v, i) => {
          const selected = i === active;
          return (
            <button
              key={v.key}
              ref={(el) => { tabRefs.current[i] = el; }}
              role="tab"
              id={`${baseId}-tab-${v.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${v.key}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? "report-views__tab report-views__tab--on" : "report-views__tab"}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              type="button"
            >
              {v.icon && <span aria-hidden="true">{v.icon} </span>}
              {v.label}
            </button>
          );
        })}
      </div>
      {views.map((v, i) => (
        <div
          key={v.key}
          role="tabpanel"
          id={`${baseId}-panel-${v.key}`}
          aria-labelledby={`${baseId}-tab-${v.key}`}
          hidden={i !== active}
          tabIndex={i === active ? 0 : -1}
          className="report-views__panel"
        >
          {v.panel}
        </div>
      ))}
    </div>
  );
}
