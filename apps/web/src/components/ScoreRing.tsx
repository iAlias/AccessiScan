import { scoreLabel } from "@/lib/format.js";

export function scoreTone(score: number | null | undefined): "fail" | "warn" | "muted" {
  if (score === null || score === undefined) return "muted";
  if (score < 50) return "fail";
  return "warn"; // automated scans cap well below "ok"; green reserved for human-cleared CONFORME
}

const ARC: Record<"fail" | "warn" | "muted", string> = { fail: "#d23b2d", warn: "#c9870a", muted: "#aab2c2" };

export function ScoreRing({ score }: { score: number | null }) {
  const tone = scoreTone(score);
  const pct = score === null || score === undefined ? 0 : Math.max(0, Math.min(100, score));
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <span className="score-ring" role="img" aria-label={`Punteggio ${scoreLabel(score)} su 100`}>
      <svg className="score-ring__svg" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e9edf5" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={ARC[tone]} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash.toFixed(2)} ${c.toFixed(2)}`} transform="rotate(-90 32 32)" />
        <text x="32" y="33" textAnchor="middle" dominantBaseline="middle" fontSize="17" fontWeight="700" fill="#131a2b">{scoreLabel(score)}</text>
      </svg>
    </span>
  );
}
