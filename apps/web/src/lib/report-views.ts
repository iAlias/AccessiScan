import type { CriterionState } from "./format.js";
import type { CriterionRow } from "@/components/CriterionList.js";

export interface CriterionCounts {
  pass: number;
  fail: number;
  na: number;
  needsReview: number;
}

/**
 * Share of criteria the evaluation could decide with certainty — PASS, FAIL or
 * NOT_APPLICABLE — over the total. NEEDS_MANUAL_REVIEW is "undecided" and drags
 * completeness down. Mirrors MAUVE++'s "Evaluation Completeness". Null when there
 * are no criteria at all (avoids 0/0).
 */
export function computeCompleteness(c: CriterionCounts): number | null {
  const total = c.pass + c.fail + c.na + c.needsReview;
  if (total === 0) return null;
  return (c.pass + c.fail + c.na) / total;
}

// ── WCAG principles ──────────────────────────────────────────────────────────

export type Principle = 1 | 2 | 3 | 4;

const PRINCIPLE_LABEL: Record<Principle, string> = {
  1: "Percepibile",
  2: "Utilizzabile",
  3: "Comprensibile",
  4: "Robusto",
};

/** The top-level WCAG principle a success criterion belongs to (its first segment). */
export function wcagPrinciple(sc: string): Principle {
  const n = Number(sc.split(".")[0]);
  return (n >= 1 && n <= 4 ? n : 4) as Principle;
}

export function principleLabel(p: Principle): string {
  return PRINCIPLE_LABEL[p];
}

export interface PrincipleGroup {
  principle: Principle;
  label: string;
  rows: CriterionRow[];
}

/** Group criteria under their WCAG principle, ordered 1→4, omitting empty principles. */
export function groupCriteriaByPrinciple(rows: CriterionRow[]): PrincipleGroup[] {
  const byPrinciple = new Map<Principle, CriterionRow[]>();
  for (const r of rows) {
    const p = wcagPrinciple(r.wcagSc);
    const list = byPrinciple.get(p) ?? [];
    list.push(r);
    byPrinciple.set(p, list);
  }
  const groups: PrincipleGroup[] = [];
  for (const p of [1, 2, 3, 4] as Principle[]) {
    const list = byPrinciple.get(p);
    if (!list || list.length === 0) continue;
    list.sort((a, b) => a.wcagSc.localeCompare(b.wcagSc, undefined, { numeric: true }));
    groups.push({ principle: p, label: principleLabel(p), rows: list });
  }
  return groups;
}

// ── Visual tone for criterion outcome badges ─────────────────────────────────

export type StateTone = "fail" | "warn" | "ok" | "muted";

const STATE_TONE: Record<CriterionState, StateTone> = {
  FAIL: "fail",
  NEEDS_MANUAL_REVIEW: "warn",
  PASS: "ok",
  NOT_APPLICABLE: "muted",
};

export function criterionStateTone(s: CriterionState): StateTone {
  return STATE_TONE[s];
}
