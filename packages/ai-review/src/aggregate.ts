import type { CriterionVerdict, AiSuggestion } from "./types.js";

export type ClusterVerdict = CriterionVerdict & { url: string };

/**
 * Per criterion: FAIL if any cluster fails; PASS only if every cluster passes
 * with confidence >= threshold; otherwise UNSURE. Evidence is taken from the
 * decisive verdict (the failing one, or the lowest-confidence pass).
 */
export function aggregateSuggestions(verdicts: ClusterVerdict[], threshold: number): AiSuggestion[] {
  const byCriterion = new Map<string, ClusterVerdict[]>();
  for (const v of verdicts) {
    const g = byCriterion.get(v.wcagSc);
    if (g) g.push(v);
    else byCriterion.set(v.wcagSc, [v]);
  }
  const out: AiSuggestion[] = [];
  for (const [wcagSc, vs] of byCriterion) {
    const fail = vs.find((v) => v.verdict === "FAIL");
    const evidenceOf = (v: ClusterVerdict): string | null =>
      v.evidenceSelector ? `${v.url} — ${v.evidenceSelector}` : v.url;
    if (fail) {
      out.push({ wcagSc, verdict: "FAIL", confidence: fail.confidence, reasoning: fail.reasoning, evidence: evidenceOf(fail) });
      continue;
    }
    const allConfidentPass = vs.every((v) => v.verdict === "PASS" && v.confidence >= threshold);
    if (allConfidentPass) {
      const weakest = [...vs].sort((a, b) => a.confidence - b.confidence)[0]!;
      out.push({ wcagSc, verdict: "PASS", confidence: weakest.confidence, reasoning: weakest.reasoning, evidence: evidenceOf(weakest) });
      continue;
    }
    const ref = [...vs].sort((a, b) => a.confidence - b.confidence)[0]!;
    out.push({ wcagSc, verdict: "UNSURE", confidence: ref.confidence, reasoning: ref.reasoning, evidence: evidenceOf(ref) });
  }
  return out.sort((a, b) => a.wcagSc.localeCompare(b.wcagSc, undefined, { numeric: true }));
}
