"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { nextPollState, type PollState, type StatusPayload } from "@/lib/scan-poll.js";
import { scanStatusLabel } from "@/lib/format.js";

const POLL_MS = 2500;

export function ScanButton({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [state, setState] = useState<PollState>({ phase: "idle", scanId: null });
  const busy = state.phase === "polling";

  async function start() {
    const res = await fetch(`/api/domains/${domainId}/scans`, { method: "POST" });
    if (!res.ok) return;
    const { scanId } = (await res.json()) as { scanId: string };
    let cur = nextPollState({ phase: "idle", scanId: null }, { kind: "started", scanId });
    setState(cur);
    const timer = setInterval(async () => {
      const r = await fetch(`/api/scans/${scanId}/status`);
      if (!r.ok) return;
      const payload = (await r.json()) as StatusPayload;
      cur = nextPollState(cur, { kind: "fetched", payload });
      setState(cur);
      if (cur.phase === "done" || cur.phase === "failed") {
        clearInterval(timer);
        if (cur.phase === "done") router.refresh();
      }
    }, POLL_MS);
  }

  return (
    <div>
      <button className="btn" onClick={start} disabled={busy}>
        {busy ? "Scansione…" : "Avvia scansione"}
      </button>
      <span role="status" aria-live="polite" className="domain-card__meta">
        {state.phase === "polling" ? ` ${scanStatusLabel(state.status)}` : ""}
        {state.phase === "failed" ? " Scansione fallita" : ""}
      </span>
    </div>
  );
}
