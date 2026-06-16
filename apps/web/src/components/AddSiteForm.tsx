"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddSiteForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      if (res.ok) { setUrl(""); setMsg("Sito aggiunto, scansione avviata."); router.refresh(); }
      else { const b = await res.json().catch(() => ({})); setMsg((b as { error?: unknown }).error ? "URL non valido (usa http:// o https://)." : "Errore."); }
    } finally { setBusy(false); }
  }

  return (
    <form className="add-site" onSubmit={submit}>
      <label htmlFor="new-site-url">Aggiungi un sito da analizzare</label>
      <div className="add-site__row">
        <input id="new-site-url" type="url" inputMode="url" placeholder="https://esempio.it" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <button className="btn" type="submit" disabled={busy}>{busy ? "Avvio…" : "Aggiungi e scansiona"}</button>
      </div>
      <span role="status" aria-live="polite" className="domain-card__meta">{msg}</span>
    </form>
  );
}
