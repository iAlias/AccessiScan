import type { Result as AxeResult } from "axe-core";
import { parseWcagTag } from "./mapper.js";
import { CATALOG_BY_SC, type SCId } from "./wcag-catalog.js";

export type AxeImpact = "minor" | "moderate" | "serious" | "critical";
const IMPACT_ORDER: Record<AxeImpact, number> = { minor: 1, moderate: 2, serious: 3, critical: 4 };

export function tagToSCId(tag: string): SCId | null {
  const sc = parseWcagTag(tag);
  return sc && CATALOG_BY_SC.has(sc) ? sc : null;
}

function scsOfRule(rule: { tags: string[] }): SCId[] {
  const out = new Set<SCId>();
  for (const t of rule.tags) {
    const sc = tagToSCId(t);
    if (sc) out.add(sc);
  }
  return [...out];
}

interface AxeLike {
  violations: AxeResult[];
  incomplete: AxeResult[];
}

export function collectSCSets(axe: AxeLike): { failSCs: Set<SCId>; reviewSCs: Set<SCId> } {
  const failSCs = new Set<SCId>();
  const reviewSCs = new Set<SCId>();
  for (const rule of axe.violations) if (rule.nodes.length) for (const sc of scsOfRule(rule)) failSCs.add(sc);
  for (const rule of axe.incomplete) if (rule.nodes.length) for (const sc of scsOfRule(rule)) reviewSCs.add(sc);
  return { failSCs, reviewSCs };
}

export interface CriterionFinding {
  sc: SCId;
  affectedNodes: number;
  maxImpact: AxeImpact;
}

export function collectPageFindings(axe: AxeLike): CriterionFinding[] {
  const acc = new Map<SCId, { nodes: number; impact: AxeImpact }>();
  for (const rule of axe.violations) {
    const scs = scsOfRule(rule);
    if (!scs.length) continue;
    for (const node of rule.nodes) {
      const impact = ((node.impact as AxeImpact | null) ?? (rule.impact as AxeImpact | null) ?? "minor");
      for (const sc of scs) {
        const e = acc.get(sc);
        if (!e) acc.set(sc, { nodes: 1, impact });
        else {
          e.nodes += 1;
          if (IMPACT_ORDER[impact] > IMPACT_ORDER[e.impact]) e.impact = impact;
        }
      }
    }
  }
  return [...acc.entries()].map(([sc, v]) => ({ sc, affectedNodes: v.nodes, maxImpact: v.impact }));
}
