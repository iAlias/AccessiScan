export function ExportBar({ scanId }: { scanId: string }) {
  const base = `/api/scans/${scanId}/report`;
  return (
    <nav aria-label="Esporta report" className="report-header">
      <span className="domain-card__meta">Esporta:</span>
      <a className="btn" href={`${base}/pdf`}>PDF</a>
      <a className="btn" href={`${base}/csv`}>CSV</a>
      <a className="btn" href={`${base}/json`}>JSON</a>
    </nav>
  );
}
