export interface StatementInput {
  registrableDomain: string;
  scanDate: string | null;
  criteria: { wcagSc: string; state: string }[];
  issues: { ruleId: string; wcagSc: string | null }[];
  today: Date;
}
export interface StatementDraft {
  conformanceStatus: "PARZIALMENTE" | "NON_CONFORME";
  nonAccessibleContent: { inosservanzaL4_2004: string[]; onereSproporzionato: string[]; fuoriAmbito: string[] };
  method: string;
  feedbackContact: string | null;
  enforcementRoute: string;
  lastUpdated: Date;
  nextReviewDue: Date;
}

const ENFORCEMENT =
  "In caso di risposta insoddisfacente è possibile rivolgersi ad AgID (Agenzia per l'Italia Digitale) tramite i canali indicati sul sito istituzionale.";

export function draftStatement(input: StatementInput): StatementDraft {
  const anyFail = input.criteria.some((c) => c.state === "FAIL");
  const seen = new Set<string>();
  const inosservanza: string[] = [];
  for (const i of input.issues) {
    const key = `${i.ruleId}|${i.wcagSc ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    inosservanza.push(i.wcagSc ? `${i.ruleId} (WCAG ${i.wcagSc})` : i.ruleId);
  }
  const nextReviewDue = new Date(input.today);
  nextReviewDue.setUTCFullYear(nextReviewDue.getUTCFullYear() + 1);
  return {
    conformanceStatus: anyFail ? "NON_CONFORME" : "PARZIALMENTE",
    nonAccessibleContent: { inosservanzaL4_2004: inosservanza, onereSproporzionato: [], fuoriAmbito: [] },
    method: "autovalutazione automatizzata",
    feedbackContact: null,
    enforcementRoute: ENFORCEMENT,
    lastUpdated: input.today,
    nextReviewDue,
  };
}
