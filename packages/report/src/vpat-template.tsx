import { renderToStaticMarkup } from "react-dom/server";
import type { ReportModel } from "./report-model.js";
import { HONESTY_DISCLAIMER } from "./report-model.js";

const VERDICT_LABEL: Record<string, string> = {
  CONFORME: "Conforme", PARZIALMENTE: "Parzialmente conforme", NON_CONFORME: "Non conforme", NON_DETERMINABILE: "Non determinabile",
};
const STATE_LABEL: Record<string, string> = {
  PASS: "Superato", FAIL: "Fallito", NEEDS_MANUAL_REVIEW: "Verifica manuale", NOT_APPLICABLE: "Non applicabile",
};
const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);

const CSS = `
  body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px;line-height:1.4;margin:24px}
  h1{font-size:20px} h2{font-size:15px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
  th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
  th{background:#f0f0f0}
  .disclaimer{background:#fff8e1;border:1px solid #e0c200;padding:8px;margin:10px 0}
  footer{margin-top:24px;border-top:1px solid #ccc;padding-top:8px;color:#444;font-size:10px}
`;

function Doc({ m }: { m: ReportModel }) {
  return (
    <html lang="it">
      <head><meta charSet="utf-8" /><title>{`Report accessibilità — ${m.domain.registrableDomain}`}</title>
        <style dangerouslySetInnerHTML={{ __html: CSS }} /></head>
      <body>
        <h1>Report di accessibilità (VPAT 2.5 EU) — {m.domain.registrableDomain}</h1>

        <h2>1. Sintesi</h2>
        <p>Punteggio: <strong>{m.score ?? "—"}</strong>/100 · Esito: <strong>{m.verdict ? VERDICT_LABEL[m.verdict] : "—"}</strong> ·
          Copertura analizzata (criteri conclusivi): <strong>{pct(m.coverageHeadline)}</strong>
          (criteri toccati dall'analisi automatica: {pct(m.coverageTouched)}) · Pagine: {m.pagesScanned}</p>
        <p className="disclaimer">{HONESTY_DISCLAIMER}</p>

        <h2>2. Criteri WCAG 2.1 AA / EN 301 549</h2>
        <table><thead><tr><th scope="col">Criterio WCAG</th><th scope="col">Clausola EN</th><th scope="col">Esito</th></tr></thead>
          <tbody>{m.criteria.map((c) => (
            <tr key={c.wcagSc}><td>{c.wcagSc}</td><td>{c.en301549Clause ?? "—"}</td><td>{STATE_LABEL[c.state] ?? c.state}</td></tr>
          ))}</tbody></table>

        <h2>3. Problemi rilevati</h2>
        <table><thead><tr><th scope="col">Pagina</th><th scope="col">Regola</th><th scope="col">WCAG</th><th scope="col">Selettore</th><th scope="col">Descrizione</th></tr></thead>
          <tbody>{m.issues.map((i, idx) => (
            <tr key={idx}><td>{i.pageUrl}</td><td>{i.ruleId}</td><td>{i.wcagSc ?? "—"}</td><td>{i.targetSelector}</td><td>{i.help ?? ""}</td></tr>
          ))}</tbody></table>

        <h2>4. Andamento</h2>
        {m.diff
          ? <p>Variazioni rispetto alla scansione precedente — nuovi: {m.diff.newCount}, risolti: {m.diff.fixedCount}, persistenti: {m.diff.persistentCount}.</p>
          : <p>Nessun confronto disponibile.</p>}

        <footer>
          Standard: {m.versions.wcag} · {m.versions.en} · Motore: axe-core {m.versions.axe}, Playwright {m.versions.playwright} ·
          Data scansione: {m.scanDate ?? "—"} · Generato: {m.generatedAt}
        </footer>
      </body>
    </html>
  );
}

export function renderVpatHtml(m: ReportModel): string {
  return "<!doctype html>" + renderToStaticMarkup(<Doc m={m} />);
}
