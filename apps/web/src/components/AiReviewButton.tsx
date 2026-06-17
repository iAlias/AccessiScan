"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "IDLE" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";
const POLL_MS = 2000;

const MESSAGE: Record<Status, string> = {
  IDLE: "",
  RUNNING: "Valutazione AI in corso…",
  DONE: "Suggerimenti AI pronti.",
  FAILED: "Valutazione AI fallita (configura il provider).",
  CANCELED: "Valutazione AI annullata.",
};

export function AiReviewButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("IDLE");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function stop() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }
  function startPolling() { if (!timer.current) timer.current = setInterval(() => void poll(), POLL_MS); }

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

  // Reflect a pass already running/finished (e.g. after a reload) and resume polling.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch(`/api/scans/${scanId}/ai-review/status`);
        if (!r.ok || !active) return;
        const { status: s } = (await r.json()) as { status: Status };
        if (!active) return;
        setStatus(s);
        if (s === "RUNNING") startPolling();
      } catch { /* ignore */ }
    })();
    return () => { active = false; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  async function start() {
    try {
      const r = await fetch(`/api/scans/${scanId}/ai-review`, { method: "POST" });
      if (r.status === 409) { setStatus("RUNNING"); startPolling(); return; } // already running elsewhere
      if (!r.ok) return;
      setStatus("RUNNING");
      void poll();
      startPolling();
    } catch { /* ignore */ }
  }

  const running = status === "RUNNING";
  return (
    <p className="card-actions">
      <button className="btn btn--ghost" type="button" onClick={() => void start()} disabled={running}>
        {running ? "Valutazione AI in corso…" : "Pre-valuta con AI"}
      </button>
      <span role="status" aria-live="polite" aria-busy={running} className="domain-card__meta">
        {MESSAGE[status]}
      </span>
    </p>
  );
}
