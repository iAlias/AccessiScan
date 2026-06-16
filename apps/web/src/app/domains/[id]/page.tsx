import { notFound } from "next/navigation";
import Link from "next/link";
import { getDomainOverview } from "@accessscan/db";
import { requireSession } from "@/lib/require-session.js";
import { ScoreRing } from "@/components/ScoreRing.js";
import { VerdictPill } from "@/components/VerdictPill.js";
import { ScanStatusBadge } from "@/components/ScanStatusBadge.js";
import { ScanButton } from "@/components/ScanButton.js";
import { formatDate, type Verdict, type ScanStatus } from "@/lib/format.js";

export const dynamic = "force-dynamic";

export default async function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const domain = await getDomainOverview(id);
  if (!domain) notFound();
  return (
    <div className="container">
      <h1>{domain.registrableDomain}</h1>
      <p className="domain-card__meta">Progetto: {domain.project.name}</p>
      <ScanButton domainId={domain.id} />
      <h2>Storico scansioni</h2>
      {domain.scans.length === 0 && <p>Nessuna scansione.</p>}
      <ul>
        {domain.scans.map((s) => (
          <li key={s.id} style={{ marginBottom: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
            <ScanStatusBadge status={s.status as ScanStatus} />
            <ScoreRing score={s.score} />
            <VerdictPill verdict={s.verdict as Verdict | null} />
            <span className="domain-card__meta">{formatDate(s.finishedAt ?? s.createdAt)}</span>
            {s.status === "DONE" && <Link href={`/scans/${s.id}`}>Apri report</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
