"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteSiteButton({ domainId, name }: { domainId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!confirm(`Eliminare il sito ${name} e tutte le sue scansioni? L'operazione non è reversibile.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/domains/${domainId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }
  return (
    <button className="btn btn--ghost" type="button" onClick={() => void del()} disabled={busy} aria-label={`Elimina il sito ${name}`}>
      Elimina
    </button>
  );
}
