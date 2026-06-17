import { notFound } from "next/navigation";
import { getDomain, getStatement, draftStatementForDomain, domainOwnerId } from "@accessscan/db";
import { requirePageSession } from "@/lib/require-session.js";
import { StatementForm, type StatementValues } from "@/components/StatementForm.js";

export const dynamic = "force-dynamic";

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession();
  const { id } = await params;
  const domain = await getDomain(id);
  if (!domain || (await domainOwnerId(id)) !== session.user!.id) notFound();
  const saved = await getStatement(id);
  const draft = saved ? null : await draftStatementForDomain(id);

  const initial: StatementValues = {
    conformanceStatus: (saved?.conformanceStatus === "NON_CONFORME" || draft?.conformanceStatus === "NON_CONFORME") ? "NON_CONFORME" : "PARZIALMENTE",
    feedbackContact: saved?.feedbackContact ?? "",
    enforcementRoute: saved?.enforcementRoute ?? draft?.enforcementRoute ?? "",
    nonAccessibleContent: (saved?.nonAccessibleContent as StatementValues["nonAccessibleContent"]) ?? draft?.nonAccessibleContent ?? { inosservanzaL4_2004: [], onereSproporzionato: [], fuoriAmbito: [] },
  };

  return (
    <div className="container">
      <h1>Dichiarazione di accessibilità — {domain.registrableDomain}</h1>
      {!saved && !draft && <p>Nessuna scansione completata: esegui prima una scansione per generare una bozza.</p>}
      <p className="domain-card__meta">Metodo: autovalutazione automatizzata. Una scansione automatica non consente lo stato “Conforme”.</p>
      <StatementForm domainId={id} initial={initial} />
    </div>
  );
}
