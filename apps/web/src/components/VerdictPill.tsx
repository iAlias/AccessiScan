import { verdictLabel, type Verdict } from "@/lib/format.js";

const TONE: Record<Verdict, string> = {
  CONFORME: "ok", PARZIALMENTE: "warn", NON_CONFORME: "fail", NON_DETERMINABILE: "muted",
};

export function VerdictPill({ verdict }: { verdict: Verdict | null }) {
  const tone = verdict ? TONE[verdict] : "muted";
  return <span className={`pill pill--${tone}`}>{verdictLabel(verdict)}</span>;
}
