"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VerdictPill } from "./VerdictPill.js";
import { ReviewStepper } from "./ReviewStepper.js";
import { criterionStateLabel, type Verdict, type CriterionState } from "@/lib/format.js";

export interface WizardStep { id: number; title: string; instructions: string; criteria: string[] }
export interface WizardCriterion { wcagSc: string; state: CriterionState; source: string; reviewNote: string | null }

export function ReviewWizard({ scanId, steps, initialCriteria, initialVerdict }: {
  scanId: string; steps: WizardStep[]; initialCriteria: WizardCriterion[]; initialVerdict: Verdict | null;
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Record<string, WizardCriterion>>(
    () => Object.fromEntries(initialCriteria.map((c) => [c.wcagSc, c])),
  );
  const [verdict, setVerdict] = useState<Verdict | null>(initialVerdict);
  const [current, setCurrent] = useState(steps[0]?.id ?? 1);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const stepInfos = useMemo(() => steps.map((s) => ({
    id: s.id, title: s.title,
    pendingCount: s.criteria.filter((sc) => criteria[sc]?.state === "NEEDS_MANUAL_REVIEW").length,
  })), [steps, criteria]);

  const step = steps.find((s) => s.id === current) ?? steps[0];

  async function decide(wcagSc: string, decision: "PASS" | "FAIL") {
    const res = await fetch(`/api/scans/${scanId}/criteria/${wcagSc}/review`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, note: notes[wcagSc] || undefined }),
    });
    if (!res.ok) return;
    const { verdict: v } = (await res.json()) as { verdict: Verdict };
    setVerdict(v);
    setCriteria((prev) => ({ ...prev, [wcagSc]: { ...prev[wcagSc]!, state: decision as CriterionState, source: "MANUAL", reviewNote: notes[wcagSc] ?? null } }));
    router.refresh();
  }

  return (
    <div className="review-wizard">
      <div className="review-banner" role="status" aria-live="polite">
        Verdetto corrente: <VerdictPill verdict={verdict} />
        {verdict === "CONFORME" && <strong> — Conforme sbloccato.</strong>}
      </div>
      <div className="review-layout">
        <ReviewStepper steps={stepInfos} current={current} />
        <section className="review-panel" aria-label={`Step ${step?.id}`}>
          <h2>{step?.id}. {step?.title}</h2>
          <p className="domain-card__meta">{step?.instructions}</p>
          {step?.criteria.length === 0 && <p>Nessun criterio in questo step.</p>}
          <ul className="review-criteria">
            {step?.criteria.map((sc) => {
              const c = criteria[sc];
              if (!c) return <li key={sc}><code>{sc}</code> — non presente in questa scansione.</li>;
              const pending = c.state === "NEEDS_MANUAL_REVIEW";
              return (
                <li key={sc}>
                  <code>{sc}</code> — {criterionStateLabel(c.state)} {c.source === "MANUAL" ? "(revisionato)" : ""}
                  {pending && (
                    <span>
                      <label htmlFor={`n-${sc}`} className="visually-hidden">Nota per {sc}</label>
                      <input id={`n-${sc}`} placeholder="Nota (opzionale)" value={notes[sc] ?? ""} onChange={(e) => setNotes({ ...notes, [sc]: e.target.value })} />
                      <button className="btn" onClick={() => void decide(sc, "PASS")}>Pass</button>
                      <button className="btn" onClick={() => void decide(sc, "FAIL")}>Fail</button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="review-nav">
            <button className="btn" disabled={current <= 1} onClick={() => setCurrent((n) => Math.max(1, n - 1))}>Indietro</button>
            <button className="btn" disabled={current >= steps.length} onClick={() => setCurrent((n) => Math.min(steps.length, n + 1))}>Avanti</button>
          </div>
        </section>
      </div>
    </div>
  );
}
