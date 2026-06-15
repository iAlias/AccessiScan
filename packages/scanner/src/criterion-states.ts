import { WCAG_CATALOG, automatabilityOf, type Automatability, type SCId } from "./wcag-catalog.js";

export type SCState = "PASS" | "FAIL" | "NEEDS_MANUAL_REVIEW" | "NOT_APPLICABLE";

export function deriveCriterionState(
  sc: SCId,
  failSCs: ReadonlySet<SCId>,
  reviewSCs: ReadonlySet<SCId>,
  automatability: (sc: SCId) => Automatability,
): Exclude<SCState, "NOT_APPLICABLE"> {
  if (failSCs.has(sc)) return "FAIL";
  if (reviewSCs.has(sc)) return "NEEDS_MANUAL_REVIEW";
  const a = automatability(sc);
  if (a === "none") return "NEEDS_MANUAL_REVIEW";
  if (a === "full") return "PASS";
  return "NEEDS_MANUAL_REVIEW";
}

export function deriveAllStates(
  failSCs: ReadonlySet<SCId>,
  reviewSCs: ReadonlySet<SCId>,
): Map<SCId, Exclude<SCState, "NOT_APPLICABLE">> {
  const out = new Map<SCId, Exclude<SCState, "NOT_APPLICABLE">>();
  for (const e of WCAG_CATALOG) out.set(e.sc, deriveCriterionState(e.sc, failSCs, reviewSCs, automatabilityOf));
  return out;
}
