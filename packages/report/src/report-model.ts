export interface ReportVersions { wcag: string; en: string; axe: string; playwright: string }
export interface ReportCriterion { wcagSc: string; en301549Clause: string | null; state: string }
export interface ReportIssue {
  pageUrl: string; ruleId: string; wcagSc: string | null; en301549Clause: string | null;
  impact: string | null; targetSelector: string; help: string | null; helpUrl: string | null; failureSummary: string | null;
}
export interface ReportDiff { newCount: number; fixedCount: number; persistentCount: number }
export interface ReportTrendPoint { score: number; capturedAt: string }

export interface ReportModel {
  scanId: string;
  generatedAt: string;
  domain: { registrableDomain: string; baseUrl: string };
  score: number | null;
  verdict: string | null;
  coverageHeadline: number | null;
  coverageTouched: number;
  pagesScanned: number;
  scanDate: string | null;
  criteria: ReportCriterion[];
  issues: ReportIssue[];
  diff: ReportDiff | null;
  versions: ReportVersions;
}

export const HONESTY_DISCLAIMER =
  "Analisi automatizzata: copre solo i criteri verificabili da uno strumento. Una scansione automatica non può attestare la conformità completa; resta necessaria la verifica manuale.";
