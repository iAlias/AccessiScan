import { recordReport } from "@accessscan/db";
import type { ReportType } from "@accessscan/db";
import { buildReportModel, toJson, toCsv, renderVpatHtml, renderPdf, validatePdf } from "@accessscan/report";

export interface ExportResult { status: number; contentType: string; body: string | Buffer; filename?: string }

const TYPE: Record<string, ReportType> = { pdf: "PDF", csv: "CSV", json: "JSON" };

export async function handleExportReport(scanId: string, format: string): Promise<ExportResult> {
  const reportType = TYPE[format];
  if (!reportType) return { status: 400, contentType: "application/json", body: JSON.stringify({ error: "bad format" }) };
  const model = await buildReportModel(scanId);
  if (!model) return { status: 404, contentType: "application/json", body: JSON.stringify({ error: "scan not found" }) };

  const url = `/api/scans/${scanId}/report/${format}`;
  if (format === "json") {
    await recordReport(scanId, "JSON", null, url);
    return { status: 200, contentType: "application/json; charset=utf-8", body: toJson(model), filename: `report-${scanId}.json` };
  }
  if (format === "csv") {
    await recordReport(scanId, "CSV", null, url);
    return { status: 200, contentType: "text/csv; charset=utf-8", body: toCsv(model), filename: `report-${scanId}.csv` };
  }
  const pdf = await renderPdf(renderVpatHtml(model));
  const passed = await validatePdf(pdf);
  await recordReport(scanId, "PDF", passed, url);
  return { status: 200, contentType: "application/pdf", body: pdf, filename: `report-${scanId}.pdf` };
}
