"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ScanStatus {
  id: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";
  phase: string | null;
  pagesFound: number;
  pagesScanned: number;
  currentUrl: string | null;
  startedAt: string | null;
  score: number | null;
  verdict: string | null;
}

const POLL_MS = 1500;
const PHASE_LABEL: Record<string, string> = { crawl: "Esplorazione del sito", scan: "Scansione delle pagine" };

function etaLabel(s: ScanStatus): string {
  if (!s.startedAt || s.pagesScanned <= 0 || s.pagesFound <= 0 || s.pagesScanned >= s.pagesFound) return "";
  const elapsed = (Date.now() - new Date(s.startedAt).getTime()) / 1000;
  const remaining = Math.round((elapsed / s.pagesScanned) * (s.pagesFound - s.pagesScanned));
  if (remaining <= 0) return "";
  return remaining >= 60 ? `~${Math.ceil(remaining / 60)} min rimanenti` : `~${remaining}s rimanenti`;
}

export function ScanButton({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [scanId, setScanId] = useState<string | null>(null);
  const [st, setSt] = useState<ScanStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function stopTimer() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }

  async function poll(id: string) {
    try {
      const r = await fetch(`/api/scans/${id}/status`);
      // Terminal client errors won't recover — stop polling instead of looping forever.
      if (r.status === 401 || r.status === 403 || r.status === 404) { stopTimer(); return; }
      if (!r.ok) return;
      const s = (await r.json()) as ScanStatus;
      setSt(s);
      if (s.status === "DONE" || s.status === "FAILED" || s.status === "CANCELED") {
        stopTimer();
        if (s.status === "DONE") router.refresh();
      }
    } catch {
      // transient network error (e.g. dev server restarting) — skip this tick, keep polling
    }
  }

  async function start() {
    if (busy || timer.current) return; // guard against double-submit (duplicate scans + leaked interval)
    setBusy(true);
    try {
      const res = await fetch(`/api/domains/${domainId}/scans`, { method: "POST" });
      if (!res.ok) return;
      const { scanId: id } = (await res.json()) as { scanId: string };
      setScanId(id);
      setSt({ id, status: "QUEUED", phase: null, pagesFound: 0, pagesScanned: 0, currentUrl: null, startedAt: null, score: null, verdict: null });
      stopTimer(); // never leak a previous interval
      void poll(id);
      timer.current = setInterval(() => void poll(id), POLL_MS);
    } catch {
      // ignore failed start (network error)
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!scanId) return;
    try {
      await fetch(`/api/scans/${scanId}/cancel`, { method: "POST" });
      // Reflect the new state immediately (cancelled, or already terminal on a 409).
      void poll(scanId);
    } catch { /* ignore */ }
  }

  const running = st ? (st.status === "RUNNING" || st.status === "QUEUED") : false;

  if (running && st) {
    const total = st.pagesFound || 0;
    const done = st.pagesScanned || 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const phase = st.phase ? (PHASE_LABEL[st.phase] ?? st.phase) : "Avvio…";
    const eta = etaLabel(st);
    return (
      <div className="scan-progress" role="status" aria-live="polite">
        <div className="scan-progress__head">
          <span className="scan-progress__phase">{phase}{total > 0 ? ` · ${done}/${total} pagine` : ""}</span>
          <button className="btn btn--danger" type="button" onClick={() => void cancel()}>Ferma</button>
        </div>
        <div className="progress-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        {st.currentUrl && <span className="domain-card__meta scan-progress__url">{st.currentUrl}</span>}
        {eta && <span className="domain-card__meta">{eta}</span>}
      </div>
    );
  }

  return (
    <div>
      <button className="btn" type="button" onClick={() => void start()} disabled={busy}>{busy ? "Avvio…" : "Avvia scansione"}</button>
      <span role="status" aria-live="polite" className="domain-card__meta">
        {st?.status === "FAILED" ? " Scansione fallita." : st?.status === "CANCELED" ? " Scansione annullata." : ""}
      </span>
    </div>
  );
}
