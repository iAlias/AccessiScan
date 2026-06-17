"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "IDLE" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";
const POLL_MS = 2000;

export function AiReviewButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("IDLE");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function stop() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }

  async function poll() {
    try {
      const r = await fetch(`/api/scans/${scanId}/ai-review/status`);
      if (r.status === 401 || r.status === 403 || r.status === 404) { stop(); return; }
      if (!r.ok) return;
      const { status: s } = (await r.json()) as { status: Status };
      setStatus(s);
      if (s === "DONE" || s === "FAILED" || s === "CANCELED") { stop(); router.refresh(); }
    } catch { /* transient */ }
  }

  async function start() {
    try {
      const r = await fetch(`/api/scans/${scanId}/ai-review`, { method: "POST" });
      if (!r.ok) return;
      setStatus("RUNNING");
      void poll();
      timer.current = setInterval(() => void poll(), POLL_MS);
    } catch { /* ignore */ }
  }

  const running = status === "RUNNING";
  return (
    <p>
      <button className="btn btn--ghost" type="button" onClick={() => void start()} disabled={running}>
        {running ? "Valutazione AI in corso…" : "Pre-valuta con AI"}
      </button>
      <span role="status" aria-live="polite" className="domain-card__meta">
        {status === "DONE" ? " Suggerimenti AI pronti." : status === "FAILED" ? " Valutazione AI fallita (configura il provider)." : status === "CANCELED" ? " Valutazione AI annullata." : ""}
      </span>
    </p>
  );
}
