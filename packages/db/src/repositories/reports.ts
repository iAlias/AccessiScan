import { prisma } from "../client.js";
import type { Report, ReportType } from "@prisma/client";

export async function recordReport(scanId: string, type: ReportType, verapdfPassed: boolean | null, storageUrl: string): Promise<Report> {
  const existing = await prisma.report.findFirst({ where: { scanId, type } });
  if (existing) {
    return prisma.report.update({ where: { id: existing.id }, data: { verapdfPassed, storageUrl, generatedAt: new Date() } });
  }
  return prisma.report.create({ data: { scanId, type, verapdfPassed, storageUrl } });
}

export function listReports(scanId: string): Promise<Report[]> {
  return prisma.report.findMany({ where: { scanId }, orderBy: { type: "asc" } });
}
