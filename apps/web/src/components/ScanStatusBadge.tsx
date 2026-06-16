import { scanStatusLabel, type ScanStatus } from "@/lib/format.js";

const TONE: Record<ScanStatus, string> = {
  QUEUED: "queued", RUNNING: "running", DONE: "done", FAILED: "failed", CANCELED: "canceled",
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return <span className={`status-badge status-badge--${TONE[status]}`}>{scanStatusLabel(status)}</span>;
}
