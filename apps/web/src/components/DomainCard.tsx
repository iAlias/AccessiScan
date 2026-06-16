import type { ReactNode } from "react";
import Link from "next/link";
import { ScoreRing } from "./ScoreRing.js";
import { VerdictPill } from "./VerdictPill.js";
import { TrendChart, type TrendPoint } from "./TrendChart.js";
import { coverageLabel, formatDate, scanStatusLabel, type Verdict, type ScanStatus } from "@/lib/format.js";

export interface DomainCardData {
  id: string;
  registrableDomain: string;
  latestScan: { score: number | null; verdict: Verdict | null; coverageRatio: number | null; finishedAt: Date | string | null } | null;
  pendingStatus?: ScanStatus | null;
  trend: TrendPoint[];
}

export function DomainCard({ data, action }: { data: DomainCardData; action: ReactNode }) {
  const s = data.latestScan;
  // RUNNING/QUEUED are surfaced live by ScanButton; only flag a finished-but-not-OK newest attempt here.
  const flagged = data.pendingStatus === "FAILED" || data.pendingStatus === "CANCELED";
  return (
    <article className="domain-card">
      <div className="domain-card__head">
        <Link className="domain-card__title" href={`/domains/${data.id}`}>{data.registrableDomain}</Link>
        <ScoreRing score={s?.score ?? null} />
      </div>
      <VerdictPill verdict={s?.verdict ?? null} />
      <TrendChart points={data.trend} />
      <p className="domain-card__meta">
        {s
          ? <>Ultima scansione: {formatDate(s.finishedAt)} · copertura {coverageLabel(s.coverageRatio)}</>
          : <>Nessuna scansione completata</>}
      </p>
      {flagged && (
        <p className="domain-card__meta domain-card__flag">
          Ultimo tentativo: {scanStatusLabel(data.pendingStatus as ScanStatus).toLowerCase()}
        </p>
      )}
      {action}
    </article>
  );
}
