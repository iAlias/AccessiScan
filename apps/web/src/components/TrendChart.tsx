import { verdictLabel, type Verdict } from "@/lib/format.js";

export interface TrendPoint { score: number; verdict: Verdict; capturedAt: Date | string }

/** Sparkline as inline SVG with a text alternative + a visually-hidden data table. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return <p className="domain-card__meta">Nessuno storico.</p>;
  const w = 120, hgt = 32, max = 100;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(hgt - (p.score / max) * hgt).toFixed(1)}`);
  const first = points[0]!.score, last = points[points.length - 1]!.score;
  const delta = last - first;
  const label = `Andamento punteggio: da ${first} a ${last} (${delta >= 0 ? "+" : ""}${delta}) su ${points.length} scansioni`;
  return (
    <figure className="trend" style={{ margin: 0 }}>
      <svg width={w} height={hgt} viewBox={`0 0 ${w} ${hgt}`} role="img" aria-label={label}>
        <polyline fill="none" stroke="#0b5cab" strokeWidth="2"
          points={coords.join(" ")} />
      </svg>
      <table className="visually-hidden">
        <caption>{label}</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Punteggio</th><th scope="col">Esito</th></tr></thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{typeof p.capturedAt === "string" ? p.capturedAt : p.capturedAt.toISOString()}</td>
              <td>{p.score}</td><td>{verdictLabel(p.verdict)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
