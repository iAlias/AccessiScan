import type { ReportModel } from "./report-model.js";

function cell(v: string | null): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = ["pageUrl", "ruleId", "wcagSc", "en301549Clause", "impact", "targetSelector", "help"];

export function toCsv(model: ReportModel): string {
  const rows = model.issues.map((i) =>
    [i.pageUrl, i.ruleId, i.wcagSc, i.en301549Clause, i.impact, i.targetSelector, i.help].map(cell).join(","),
  );
  return [HEADER.join(","), ...rows].join("\n") + "\n";
}
