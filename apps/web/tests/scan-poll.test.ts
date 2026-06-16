import { expect, test } from "vitest";
import { nextPollState, type PollState, type StatusPayload } from "../src/lib/scan-poll.js";

const idle: PollState = { phase: "idle", scanId: null };

test("starting a scan moves to polling QUEUED", () => {
  const s = nextPollState(idle, { kind: "started", scanId: "s1" });
  expect(s).toEqual({ phase: "polling", scanId: "s1", status: "QUEUED" });
});

test("a RUNNING fetch keeps polling", () => {
  const prev: PollState = { phase: "polling", scanId: "s1", status: "QUEUED" };
  const payload: StatusPayload = { id: "s1", status: "RUNNING", score: null, verdict: null };
  expect(nextPollState(prev, { kind: "fetched", payload }).phase).toBe("polling");
});

test("a DONE fetch finishes", () => {
  const prev: PollState = { phase: "polling", scanId: "s1", status: "RUNNING" };
  const payload: StatusPayload = { id: "s1", status: "DONE", score: 55, verdict: "PARZIALMENTE" };
  const s = nextPollState(prev, { kind: "fetched", payload });
  expect(s.phase).toBe("done");
});

test("a FAILED fetch errors", () => {
  const prev: PollState = { phase: "polling", scanId: "s1", status: "RUNNING" };
  const payload: StatusPayload = { id: "s1", status: "FAILED", score: null, verdict: null };
  expect(nextPollState(prev, { kind: "fetched", payload }).phase).toBe("failed");
});

test("a fetch for a stale scanId is ignored", () => {
  const prev: PollState = { phase: "polling", scanId: "s1", status: "RUNNING" };
  const payload: StatusPayload = { id: "old", status: "DONE", score: 1, verdict: "CONFORME" };
  expect(nextPollState(prev, { kind: "fetched", payload })).toEqual(prev);
});
