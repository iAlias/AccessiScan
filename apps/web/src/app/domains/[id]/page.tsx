import { notFound } from "next/navigation";
import Link from "next/link";
import { getDomainOverview } from "@accessscan/db";
import { requirePageSession } from "@/lib/require-session.js";
import { ScanButton } from "@/components/ScanButton.js";
import { ScanHistoryTable, type ScanHistoryRow } from "@/components/ScanHistoryTable.js";

export const dynamic = "force-dynamic";

export default async function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession();
  const { id } = await params;
  const domain = await getDomainOverview(id);
  if (!domain || domain.project.ownerId !== session.user!.id) notFound();
  return (
    <div className="container">
      <p className="domain-card__meta"><Link href="/">← Panoramica</Link></p>
      <h1>{domain.registrableDomain}</h1>
      <p className="domain-card__meta">Progetto: {domain.project.name}</p>
      <div className="card-actions">
        <ScanButton domainId={domain.id} />
        <Link className="btn btn--ghost" href={`/domains/${domain.id}/statement`}>Dichiarazione di accessibilità</Link>
      </div>
      <h2>Storico scansioni</h2>
      <ScanHistoryTable scans={domain.scans as ScanHistoryRow[]} />
    </div>
  );
}
