import { getOverview } from "@accessscan/db";
import { requireSession } from "@/lib/require-session.js";
import { DomainCard } from "@/components/DomainCard.js";
import { ScanButton } from "@/components/ScanButton.js";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requireSession();
  const projects = await getOverview();
  return (
    <div className="container">
      <h1>Panoramica</h1>
      {projects.length === 0 && <p>Nessun progetto.</p>}
      {projects.map((p) => (
        <section key={p.id} className="project-section" aria-label={`Progetto ${p.name}`}>
          <h2>{p.name}</h2>
          {p.domains.length === 0 && <p className="domain-card__meta">Nessun dominio.</p>}
          <div className="domain-grid">
            {p.domains.map((d) => (
              <DomainCard key={d.id} data={d} action={<ScanButton domainId={d.id} />} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
