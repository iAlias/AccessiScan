import type { ReactNode } from "react";
import Link from "next/link";
import { ScoreRing } from "./ScoreRing.js";
import { VerdictPill } from "./VerdictPill.js";
import { TrendChart, type TrendPoint } from "./TrendChart.js";
import { coverageLabel, formatDate, type Verdict } from "@/lib/format.js";

export interface DomainCardData {
  id: string;
  registrableDomain: string;
  latestScan: { score: number | null; verdict: Verdict | null; coverageRatio: number | null; finishedAt: Date | string | null } | null;
  trend: TrendPoint[];
}

export function DomainCard({ data, action }: { data: DomainCardData; action: ReactNode }) {
  const s = data.latestScan;
  return (
    <article className="domain-card">
      <div className="domain-card__head">
        <Link className="domain-card__title" href={`/domains/${data.id}`}>{data.registrableDomain}</Link>
        <ScoreRing score={s?.score ?? null} />
      </div>
      <VerdictPill verdict={s?.verdict ?? null} />
      <TrendChart points={data.trend} />
      <p className="domain-card__meta">
        Ultima scansione: {formatDate(s?.finishedAt ?? null)} · copertura {coverageLabel(s?.coverageRatio ?? null)}
      </p>
      {action}
    </article>
  );
}
