export type Verdict = "CONFORME" | "PARZIALMENTE" | "NON_CONFORME" | "NON_DETERMINABILE";
export type CriterionState = "PASS" | "FAIL" | "NEEDS_MANUAL_REVIEW" | "NOT_APPLICABLE";
export type ScanStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";
export type Impact = "CRITICAL" | "SERIOUS" | "MODERATE" | "MINOR";

const VERDICT: Record<Verdict, string> = {
  CONFORME: "Conforme",
  PARZIALMENTE: "Parzialmente conforme",
  NON_CONFORME: "Non conforme",
  NON_DETERMINABILE: "Non determinabile",
};
export function verdictLabel(v: Verdict | null | undefined): string {
  return v ? VERDICT[v] : "—";
}

export function scoreLabel(score: number | null | undefined): string {
  return score === null || score === undefined ? "—" : String(Math.round(score));
}

export function coverageLabel(ratio: number | null | undefined): string {
  return ratio === null || ratio === undefined ? "—" : `${Math.round(ratio * 100)}%`;
}

const STATE: Record<CriterionState, string> = {
  PASS: "Superato",
  FAIL: "Fallito",
  NEEDS_MANUAL_REVIEW: "Verifica manuale",
  NOT_APPLICABLE: "Non applicabile",
};
export function criterionStateLabel(s: CriterionState): string { return STATE[s]; }

const STATUS: Record<ScanStatus, string> = {
  QUEUED: "In coda", RUNNING: "In corso", DONE: "Completata", FAILED: "Fallita",
  CANCELED: "Annullata",
};
export function scanStatusLabel(s: ScanStatus): string { return STATUS[s]; }

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// ── Severity (axe impact) ────────────────────────────────────────────────────

const IMPACT: Record<Impact, string> = {
  CRITICAL: "Critico", SERIOUS: "Serio", MODERATE: "Moderato", MINOR: "Minore",
};
export function impactLabel(i: Impact | null | undefined): string {
  return i ? IMPACT[i] : "Non classificato";
}

const IMPACT_RANK: Record<Impact, number> = { CRITICAL: 0, SERIOUS: 1, MODERATE: 2, MINOR: 3 };
/** Lower = more severe; nulls sort last. */
export function impactRank(i: Impact | null | undefined): number {
  return i ? IMPACT_RANK[i] : 99;
}

/** CSS modifier key for severity chips: sev--critical, etc. */
export function impactTone(i: Impact | null | undefined): "critical" | "serious" | "moderate" | "minor" | "muted" {
  return i ? (i.toLowerCase() as "critical" | "serious" | "moderate" | "minor") : "muted";
}

/** Thousands-separated integer in Italian locale (16814 → "16.814"). */
export function formatInt(n: number): string {
  return new Intl.NumberFormat("it-IT").format(n);
}

/**
 * Returns the URL only if it is a plain http(s) link, else null. Defence-in-depth
 * for hrefs whose value originates outside the app (issue helpUrls): React escapes
 * text but NOT attribute schemes, so a `javascript:`/`data:` URL would otherwise be
 * clickable. Render the link only when this returns non-null.
 */
export function safeExternalHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
