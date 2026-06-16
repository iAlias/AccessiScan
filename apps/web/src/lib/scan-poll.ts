import type { ScanStatus, Verdict } from "./format.js";

export interface StatusPayload {
  id: string;
  status: ScanStatus;
  score: number | null;
  verdict: Verdict | null;
}

export type PollState =
  | { phase: "idle"; scanId: null }
  | { phase: "polling"; scanId: string; status: ScanStatus }
  | { phase: "done"; scanId: string; status: "DONE" }
  | { phase: "failed"; scanId: string; status: "FAILED" };

export type PollEvent =
  | { kind: "started"; scanId: string }
  | { kind: "fetched"; payload: StatusPayload };

export function nextPollState(prev: PollState, ev: PollEvent): PollState {
  if (ev.kind === "started") {
    return { phase: "polling", scanId: ev.scanId, status: "QUEUED" };
  }
  // fetched
  if (prev.phase !== "polling" || ev.payload.id !== prev.scanId) return prev; // stale/ignore
  const status = ev.payload.status;
  if (status === "DONE") return { phase: "done", scanId: prev.scanId, status: "DONE" };
  if (status === "FAILED") return { phase: "failed", scanId: prev.scanId, status: "FAILED" };
  return { phase: "polling", scanId: prev.scanId, status };
}
