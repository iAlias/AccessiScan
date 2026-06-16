import type { SCId } from "./wcag-catalog.js";
import type { SCState } from "./criterion-states.js";
import type { Verdict } from "./verdict.js";

export type ReviewSource = "AUTOMATED" | "MANUAL";

export interface ReviewProcedure { id: number; title: string; instructions: string; criteria: SCId[] }
export interface ReviewStep { id: number; title: string; instructions: string; criteria: SCId[] }

export const PROCEDURES: ReviewProcedure[] = [
  { id: 1, title: "Navigazione da sola tastiera", instructions: "Percorri i flussi chiave (home, navigazione, ricerca, form, checkout, modali, menu) usando solo la tastiera: tutto raggiungibile e operabile, nessuna trappola di focus.", criteria: ["2.1.1", "2.1.2", "2.4.3", "2.4.7"] },
  { id: 2, title: "Passata con screen reader (NVDA/VoiceOver)", instructions: "Attraversa immagini/alt, struttura heading, nome/ruolo/valore dei widget, elenco link, label dei form e messaggi di stato.", criteria: ["1.1.1", "1.3.1", "2.4.1", "2.4.4", "3.3.1", "3.3.2", "4.1.2", "4.1.3"] },
  { id: 3, title: "Ingrandimento testo al 200%", instructions: "Porta il testo al 200%: nessuna perdita di contenuto o funzionalità, nessun overlap.", criteria: ["1.4.4"] },
  { id: 4, title: "Reflow a 320px (zoom 400%)", instructions: "A 320px di larghezza (256px in altezza) il contenuto rifluisce senza scroll orizzontale e senza perdita di informazioni.", criteria: ["1.4.10"] },
  { id: 5, title: "Ordine e visibilità del focus", instructions: "Tabulando l'intera pagina, l'ordine è logico e l'indicatore di focus è sempre chiaramente visibile (anche dietro elementi sticky).", criteria: ["2.4.3", "2.4.7"] },
  { id: 6, title: "Errori ed etichette dei form", instructions: "Inserisci dati errati: errori individuati e descritti, suggerimenti forniti, annuncio allo screen reader, reversibilità/conferma per transazioni.", criteria: ["3.3.1", "3.3.2", "3.3.3", "3.3.4"] },
  { id: 7, title: "Sottotitoli, audiodescrizione e trascrizioni", instructions: "Per ogni media: sottotitoli sincronizzati, audiodescrizione/alternativa per il video, trascrizione per il solo-audio.", criteria: ["1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5"] },
  { id: 8, title: "Movimento, lampeggi e controllo del sonoro", instructions: "Nessun lampeggio >3/s (PEAT), contenuti in movimento >5s mettibili in pausa, audio autoplay >3s controllabile, nessuna risposta forzata al movimento.", criteria: ["2.3.1", "2.2.2", "1.4.2", "2.1.2"] },
];

const RESIDUAL_INSTRUCTIONS = "Criteri che richiedono verifica manuale non coperti dalle procedure precedenti. Valutali singolarmente e marca l'esito.";

export function buildReviewSteps(pendingSCs: readonly SCId[]): ReviewStep[] {
  const covered = new Set<SCId>(PROCEDURES.flatMap((p) => p.criteria));
  const steps: ReviewStep[] = PROCEDURES.map((p) => ({ id: p.id, title: p.title, instructions: p.instructions, criteria: [...p.criteria] }));
  const residual = pendingSCs.filter((sc) => !covered.has(sc));
  steps.push({ id: 9, title: "Criteri residui", instructions: RESIDUAL_INSTRUCTIONS, criteria: residual });
  return steps;
}

export function recomputeVerdict(input: {
  criteria: ReadonlyArray<{ state: SCState; source: ReviewSource }>;
  automatedBlockingFail: boolean;
}): { verdict: Verdict; manualReviewLabel: boolean } {
  const anyManualFail = input.criteria.some((c) => c.state === "FAIL" && c.source === "MANUAL");
  const anyFail = input.criteria.some((c) => c.state === "FAIL");
  const anyNeedsReview = input.criteria.some((c) => c.state === "NEEDS_MANUAL_REVIEW");
  if (input.automatedBlockingFail || anyManualFail) return { verdict: "NON_CONFORME", manualReviewLabel: false };
  if (anyFail) return { verdict: "PARZIALMENTE", manualReviewLabel: false };
  if (anyNeedsReview) return { verdict: "PARZIALMENTE", manualReviewLabel: true };
  return { verdict: "CONFORME", manualReviewLabel: false };
}
