import type { AxeImpact, CriterionFinding } from "./sc-mapping.js";

export const IMPACT_WEIGHT: Record<AxeImpact, number> = { critical: 10, serious: 6, moderate: 3, minor: 1 };
const CAP = 25;
const K_DEFAULT = 0.6;

export function scoreCriterion(f: CriterionFinding): number {
  const weight = IMPACT_WEIGHT[f.maxImpact];
  const density = 0.5 + 0.5 * Math.min(1, f.affectedNodes / 10);
  return Math.min(CAP, weight * density);
}

export function computeScore(findings: readonly CriterionFinding[], K = K_DEFAULT): number {
  const sum = findings.reduce((acc, f) => acc + scoreCriterion(f), 0);
  return Math.max(0, 100 - K * sum);
}

export function aggregateSiteFindings(perPage: readonly (readonly CriterionFinding[])[]): CriterionFinding[] {
  const order: Record<AxeImpact, number> = { minor: 1, moderate: 2, serious: 3, critical: 4 };
  const acc = new Map<string, CriterionFinding>();
  for (const page of perPage) {
    for (const f of page) {
      const e = acc.get(f.sc);
      if (!e) acc.set(f.sc, { ...f });
      else {
        e.affectedNodes += f.affectedNodes;
        if (order[f.maxImpact] > order[e.maxImpact]) e.maxImpact = f.maxImpact;
      }
    }
  }
  return [...acc.values()];
}

export function computePageScore(pageFindings: readonly CriterionFinding[], K = K_DEFAULT): number {
  return computeScore(pageFindings, K);
}

export function computeSiteScore(perPage: readonly (readonly CriterionFinding[])[], K = K_DEFAULT): number {
  return computeScore(aggregateSiteFindings(perPage), K);
}
