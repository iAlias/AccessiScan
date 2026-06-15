import { createHash } from "node:crypto";
import type { AxeImpact } from "./sc-mapping.js";
import type { SCId } from "./wcag-catalog.js";

export interface PersistedIssue {
  ruleId: string;
  scId: SCId;
  selector: string;
  pageUrlPath: string;
  maxImpact: AxeImpact;
}

export type Fingerprint = string;

function normalizeSelector(sel: string): string {
  return sel
    .replace(/:nth-child\(\d+\)/g, "")
    .replace(/#[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function fingerprintIssue(i: Omit<PersistedIssue, "maxImpact">): Fingerprint {
  return createHash("sha1")
    .update([i.ruleId, i.scId, normalizeSelector(i.selector), i.pageUrlPath].join("|"), "utf8")
    .digest("hex");
}

export interface ScanDiff {
  newIssues: Fingerprint[];
  fixedIssues: Fingerprint[];
  persistentIssues: Fingerprint[];
  regressed: Fingerprint[];
  counts: { new: number; fixed: number; persistent: number };
}

const ORDER: Record<AxeImpact, number> = { minor: 1, moderate: 2, serious: 3, critical: 4 };

export function computeScanDiff(prev: readonly PersistedIssue[], curr: readonly PersistedIssue[]): ScanDiff {
  const prevMap = new Map<Fingerprint, AxeImpact>();
  for (const i of prev) prevMap.set(fingerprintIssue(i), i.maxImpact);
  const currMap = new Map<Fingerprint, AxeImpact>();
  for (const i of curr) currMap.set(fingerprintIssue(i), i.maxImpact);

  const newIssues = [...currMap.keys()].filter((f) => !prevMap.has(f));
  const fixedIssues = [...prevMap.keys()].filter((f) => !currMap.has(f));
  const persistentIssues = [...currMap.keys()].filter((f) => prevMap.has(f));
  const regressed = persistentIssues.filter((f) => ORDER[currMap.get(f)!] > ORDER[prevMap.get(f)!]);

  return {
    newIssues,
    fixedIssues,
    persistentIssues,
    regressed,
    counts: { new: newIssues.length, fixed: fixedIssues.length, persistent: persistentIssues.length },
  };
}
