import type { ReportModel } from "./report-model.js";

export function toJson(model: ReportModel): string {
  return JSON.stringify(model, null, 2);
}
