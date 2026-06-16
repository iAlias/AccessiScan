interface DiffLike { newIssueIds: unknown; fixedIssueIds: unknown; persistentIssueIds: unknown }
const len = (j: unknown): number => (Array.isArray(j) ? j.length : 0);

export function DiffSummary({ diff }: { diff: DiffLike | null }) {
  if (!diff) return <p className="domain-card__meta">Nessun confronto disponibile.</p>;
  return (
    <ul aria-label="Variazioni rispetto alla scansione precedente">
      <li>Nuovi problemi: {len(diff.newIssueIds)}</li>
      <li>Risolti: {len(diff.fixedIssueIds)}</li>
      <li>Persistenti: {len(diff.persistentIssueIds)}</li>
    </ul>
  );
}
