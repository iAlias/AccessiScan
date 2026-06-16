import Link from "next/link";
import { ScanStatusBadge } from "./ScanStatusBadge.js";
import { VerdictPill } from "./VerdictPill.js";
import { scoreLabel, coverageLabel, formatDate, formatInt, type Verdict, type ScanStatus } from "@/lib/format.js";

export interface ScanHistoryRow {
  id: string;
  status: ScanStatus;
  score: number | null;
  verdict: Verdict | null;
  coverageRatio: number | null;
  pagesScanned: number;
  finishedAt: Date | string | null;
  createdAt: Date | string;
}

export function ScanHistoryTable({ scans }: { scans: ScanHistoryRow[] }) {
  if (scans.length === 0) return <p className="domain-card__meta">Nessuna scansione.</p>;
  return (
    <table className="history-table">
      <thead>
        <tr>
          <th scope="col">Data</th>
          <th scope="col">Stato</th>
          <th scope="col">Punteggio</th>
          <th scope="col">Esito</th>
          <th scope="col">Copertura</th>
          <th scope="col">Pagine</th>
          <th scope="col">Report</th>
        </tr>
      </thead>
      <tbody>
        {scans.map((s) => (
          <tr key={s.id}>
            <td>{formatDate(s.finishedAt ?? s.createdAt)}</td>
            <td><ScanStatusBadge status={s.status} /></td>
            <td>{scoreLabel(s.score)}</td>
            <td><VerdictPill verdict={s.verdict} /></td>
            <td>{coverageLabel(s.coverageRatio)}</td>
            <td>{formatInt(s.pagesScanned)}</td>
            <td>{s.status === "DONE" ? <Link href={`/scans/${s.id}`}>Apri</Link> : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
