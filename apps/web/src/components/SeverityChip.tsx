import { impactLabel, impactTone, type Impact } from "@/lib/format.js";

/** Small colored badge for an axe severity (Critico/Serio/Moderato/Minore). */
export function SeverityChip({ impact }: { impact: Impact | null | undefined }) {
  return <span className={`sev sev--${impactTone(impact)}`}>{impactLabel(impact)}</span>;
}
