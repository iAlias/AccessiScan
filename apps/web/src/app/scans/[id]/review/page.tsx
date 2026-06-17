import { notFound } from "next/navigation";
import { getReviewState, scanOwnerId, getAiSuggestions } from "@accessscan/db";
import { buildReviewSteps } from "@accessscan/scanner";
import { requireAdminPage } from "@/lib/require-session.js";
import { ReviewWizard, type WizardCriterion } from "@/components/ReviewWizard.js";
import type { Verdict, CriterionState } from "@/lib/format.js";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminPage();
  const { id } = await params;
  if ((await scanOwnerId(id)) !== session.user!.id) notFound();
  const state = await getReviewState(id);
  if (!state) notFound();
  const pending = state.criteria.filter((c) => c.state === "NEEDS_MANUAL_REVIEW").map((c) => c.wcagSc);
  const steps = buildReviewSteps(pending).map((s) => ({ id: s.id, title: s.title, instructions: s.instructions, criteria: s.criteria }));
  const ai = await getAiSuggestions(id);
  const aiByCriterion = new Map(ai.map((a) => [a.wcagSc, a]));
  const criteria: WizardCriterion[] = state.criteria.map((c) => {
    const a = aiByCriterion.get(c.wcagSc);
    return {
      wcagSc: c.wcagSc, state: c.state as CriterionState, source: c.source, reviewNote: c.reviewNote,
      aiState: (a?.aiState ?? null) as CriterionState | null, aiReasoning: a?.aiReasoning ?? null,
      aiConfidence: a?.aiConfidence ?? null, aiEvidence: a?.aiEvidence ?? null,
    };
  });
  return (
    <div className="container">
      <h1>Revisione manuale</h1>
      <p className="domain-card__meta">Marca i criteri pendenti. “Conforme” si sblocca solo con tutti i criteri risolti e nessun fallimento.</p>
      <ReviewWizard scanId={id} steps={steps} initialCriteria={criteria} initialVerdict={state.verdict as Verdict | null} />
    </div>
  );
}
