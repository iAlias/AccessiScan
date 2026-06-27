"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { progressView, formatElapsed, isStalled } from "@/lib/scan-progress.js";

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
const STEPS = ["Avvio", "Esplorazione", "Scansione"] as const;

function etaLabel(s: ScanStatus, nowMs: number): string {
  if (!s.startedAt || s.pagesScanned <= 0 || s.pagesFound <= 0 || s.pagesScanned >= s.pagesFound) return "";
  const elapsed = (nowMs - new Date(s.startedAt).getTime()) / 1000;
  const remaining = Math.round((elapsed / s.pagesScanned) * (s.pagesFound - s.pagesScanned));
  if (remaining <= 0) return "";
  return remaining >= 60 ? `~${Math.ceil(remaining / 60)} min rimanenti` : `~${remaining}s rimanenti`;
}

export function ScanButton({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [scanId, setScanId] = useState<string | null>(null);
  const [st, setSt] = useState<ScanStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  // Local fallbacks so elapsed/stall work before the server reports startedAt.
  const localStart = useRef<number | null>(null);
  const lastSig = useRef<string>("");
  const lastChangeAt = useRef<number>(Date.now());

  useEffect(() => () => { stopTimer(); stopClock(); }, []);

  function stopTimer() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }
  function stopClock() { if (clock.current) { clearInterval(clock.current); clock.current = null; } }
  function startClock() { if (!clock.current) clock.current = setInterval(() => setNow(Date.now()), 1000); }

  async function poll(id: string) {
    try {
      const r = await fetch(`/api/scans/${id}/status`);
      // Terminal client errors won't recover — stop polling instead of looping forever.
      if (r.status === 401 || r.status === 403 || r.status === 404) { stopTimer(); stopClock(); return; }
      if (!r.ok) return;
      const s = (await r.json()) as ScanStatus;
      // Track when progress last advanced, to tell "working" from "possibly stuck".
      const sig = `${s.phase}|${s.pagesFound}|${s.pagesScanned}|${s.currentUrl}`;
      if (sig !== lastSig.current) { lastSig.current = sig; lastChangeAt.current = Date.now(); }
      setSt(s);
      if (s.status === "DONE" || s.status === "FAILED" || s.status === "CANCELED") {
        stopTimer();
        stopClock();
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
      localStart.current = Date.now();
      lastSig.current = "";
      lastChangeAt.current = Date.now();
      setSt({ id, status: "QUEUED", phase: null, pagesFound: 0, pagesScanned: 0, currentUrl: null, startedAt: null, score: null, verdict: null });
      stopTimer(); // never leak a previous interval
      void poll(id);
      timer.current = setInterval(() => void poll(id), POLL_MS);
      startClock();
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
    const v = progressView(st);
    const startMs = st.startedAt ? new Date(st.startedAt).getTime() : localStart.current ?? now;
    const elapsed = formatElapsed((now - startMs) / 1000);
    const eta = etaLabel(st, now);
    const stalled = isStalled(now - lastChangeAt.current);

    return (
      <div className="scan-progress" role="status" aria-live="polite">
        <div className="scan-progress__head">
          <span className="scan-progress__title">
            <span className="spinner" aria-hidden="true" />
            {v.title}
          </span>
          <button className="btn btn--danger" type="button" onClick={() => void cancel()}>Ferma</button>
        </div>

        <ol className="scan-steps" aria-hidden="true">
          {STEPS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const state = n < v.step ? "done" : n === v.step ? "on" : "todo";
            return <li key={label} className={`scan-steps__item scan-steps__item--${state}`}>{label}</li>;
          })}
        </ol>

        <div
          className={`progress-bar${v.indeterminate ? " progress-bar--indeterminate" : ""}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          {...(v.pct !== null ? { "aria-valuenow": v.pct } : {})}
          aria-label={v.title}
        >
          <i style={v.indeterminate ? undefined : { width: `${v.pct ?? 0}%` }} />
        </div>

        <div className="scan-progress__line">
          <span>{v.detail}{v.pct !== null ? ` · ${v.pct}%` : ""}</span>
          <span className="scan-progress__elapsed">{elapsed}{eta ? ` · ${eta}` : ""}</span>
        </div>

        {st.currentUrl && <span className="domain-card__meta scan-progress__url" title={st.currentUrl}>{st.currentUrl}</span>}

        {stalled && (
          <p className="scan-progress__stall" role="alert">
            Nessun avanzamento da oltre 30 secondi. La scansione potrebbe essere rallentata da una pagina lenta — attendi ancora o premi «Ferma».
          </p>
        )}
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
