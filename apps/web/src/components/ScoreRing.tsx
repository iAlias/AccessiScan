import { scoreLabel } from "@/lib/format.js";

export function scoreTone(score: number | null | undefined): "fail" | "warn" | "muted" {
  if (score === null || score === undefined) return "muted";
  if (score < 50) return "fail";
  return "warn"; // automated scans cap well below "ok"; green reserved for human-cleared CONFORME
}

export function ScoreRing({ score }: { score: number | null }) {
  const tone = scoreTone(score);
  return (
    <span className={`score-ring score-ring--${tone}`} role="img"
      aria-label={`Punteggio ${scoreLabel(score)} su 100`}>
      <span aria-hidden="true">{scoreLabel(score)}</span>
    </span>
  );
}
