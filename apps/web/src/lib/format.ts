export type Verdict = "CONFORME" | "PARZIALMENTE" | "NON_CONFORME" | "NON_DETERMINABILE";
export type CriterionState = "PASS" | "FAIL" | "NEEDS_MANUAL_REVIEW" | "NOT_APPLICABLE";
export type ScanStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";

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
