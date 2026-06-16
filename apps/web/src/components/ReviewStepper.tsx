export interface StepInfo { id: number; title: string; pendingCount: number }
export function ReviewStepper({ steps, current }: { steps: StepInfo[]; current: number }) {
  return (
    <nav aria-label="Procedure di revisione">
      <ol className="review-stepper">
        {steps.map((s) => (
          <li key={s.id} aria-current={s.id === current ? "step" : undefined}
            className={s.pendingCount === 0 ? "review-step--done" : s.id === current ? "review-step--cur" : ""}>
            {s.id}. {s.title} {s.pendingCount === 0 ? "✓" : `(${s.pendingCount})`}
          </li>
        ))}
      </ol>
    </nav>
  );
}
