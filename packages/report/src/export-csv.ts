import type { ReportModel } from "./report-model.js";

function cell(v: string | null): string {
  let s = v ?? "";
  // Neutralize spreadsheet formula injection: a leading =,+,-,@,tab,CR makes Excel/
  // Sheets evaluate the cell. Prefix with a single quote so it is treated as text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = ["pageUrl", "ruleId", "wcagSc", "en301549Clause", "impact", "targetSelector", "help"];

export function toCsv(model: ReportModel): string {
  const rows = model.issues.map((i) =>
    [i.pageUrl, i.ruleId, i.wcagSc, i.en301549Clause, i.impact, i.targetSelector, i.help].map(cell).join(","),
  );
  return [HEADER.join(","), ...rows].join("\n") + "\n";
}
