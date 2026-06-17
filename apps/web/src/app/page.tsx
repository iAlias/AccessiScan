import { getOverview } from "@accessscan/db";
import { requirePageSession } from "@/lib/require-session.js";
import { DomainCard } from "@/components/DomainCard.js";
import { ScanButton } from "@/components/ScanButton.js";
import { DeleteSiteButton } from "@/components/DeleteSiteButton.js";
import { AddSiteForm } from "@/components/AddSiteForm.js";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await requirePageSession();
  const projects = await getOverview(session.user!.id);
  return (
    <div className="container">
      <h1>Panoramica</h1>
      <AddSiteForm />
      {projects.length === 0 && <p>Nessun progetto.</p>}
      {projects.map((p) => (
        <section key={p.id} className="project-section" aria-label={`Progetto ${p.name}`}>
          <h2>{p.name}</h2>
          {p.domains.length === 0 && <p className="domain-card__meta">Nessun dominio.</p>}
          <div className="domain-grid">
            {p.domains.map((d) => (
              <DomainCard key={d.id} data={d} action={
                <div className="card-actions">
                  <ScanButton domainId={d.id} />
                  <DeleteSiteButton domainId={d.id} name={d.registrableDomain} />
                </div>
              } />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
