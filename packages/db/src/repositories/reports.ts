import { prisma } from "../client.js";
import type { Report, ReportType } from "@prisma/client";

export function recordReport(scanId: string, type: ReportType, verapdfPassed: boolean | null, storageUrl: string): Promise<Report> {
  // Atomic on the (scanId, type) unique constraint — no find-then-create race / duplicates.
  return prisma.report.upsert({
    where: { scanId_type: { scanId, type } },
    update: { verapdfPassed, storageUrl, generatedAt: new Date() },
    create: { scanId, type, verapdfPassed, storageUrl },
  });
}

export function listReports(scanId: string): Promise<Report[]> {
  return prisma.report.findMany({ where: { scanId }, orderBy: { type: "asc" } });
}
