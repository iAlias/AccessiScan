"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface StatementValues {
  conformanceStatus: "PARZIALMENTE" | "NON_CONFORME";
  feedbackContact: string;
  enforcementRoute: string;
  nonAccessibleContent: { inosservanzaL4_2004: string[]; onereSproporzionato: string[]; fuoriAmbito: string[] };
}

export function StatementForm({ domainId, initial }: { domainId: string; initial: StatementValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);

  async function save() {
    const res = await fetch(`/api/domains/${domainId}/statement`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ conformanceStatus: v.conformanceStatus, feedbackContact: v.feedbackContact || null, enforcementRoute: v.enforcementRoute || null, nonAccessibleContent: v.nonAccessibleContent }),
    });
    if (res.ok) { setSaved(true); router.refresh(); }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <p>
        <label htmlFor="cs">Stato di conformità</label><br />
        <select id="cs" value={v.conformanceStatus} onChange={(e) => setV({ ...v, conformanceStatus: e.target.value as StatementValues["conformanceStatus"] })}>
          <option value="PARZIALMENTE">Parzialmente conforme</option>
          <option value="NON_CONFORME">Non conforme</option>
        </select>
      </p>
      <p>
        <label htmlFor="fc">Recapito feedback</label><br />
        <input id="fc" value={v.feedbackContact} onChange={(e) => setV({ ...v, feedbackContact: e.target.value })} />
      </p>
      <p>
        <label htmlFor="er">Procedura di attuazione</label><br />
        <textarea id="er" value={v.enforcementRoute} onChange={(e) => setV({ ...v, enforcementRoute: e.target.value })} rows={3} />
      </p>
      <button className="btn" type="submit">Salva dichiarazione</button>
      <span role="status" aria-live="polite" className="domain-card__meta">{saved ? " Salvata." : ""}</span>
    </form>
  );
}
