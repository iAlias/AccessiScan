import { prisma } from "../client.js";
import type { Prisma } from "@prisma/client";

const latestScanSelect = {
  id: true, status: true, score: true, verdict: true,
  coverageRatio: true, pagesScanned: true, finishedAt: true, createdAt: true,
} satisfies Prisma.ScanSelect;

const trendSelect = {
  score: true, verdict: true, capturedAt: true,
} satisfies Prisma.ScoreHistorySelect;

export type LatestScan = Prisma.ScanGetPayload<{ select: typeof latestScanSelect }>;
export type TrendPoint = Prisma.ScoreHistoryGetPayload<{ select: typeof trendSelect }>;

export interface DomainOverview {
  id: string;
  baseUrl: string;
  registrableDomain: string;
  latestScan: LatestScan | null;
  trend: TrendPoint[]; // ascending capturedAt
}
export interface ProjectOverview {
  id: string;
  name: string;
  domains: DomainOverview[];
}

export async function getOverview(): Promise<ProjectOverview[]> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      domains: {
        orderBy: { createdAt: "asc" },
        include: {
          scans: { orderBy: { createdAt: "desc" }, take: 1, select: latestScanSelect },
          scoreHistory: { orderBy: { capturedAt: "desc" }, take: 10, select: trendSelect },
        },
      },
    },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    domains: p.domains.map((d) => ({
      id: d.id,
      baseUrl: d.baseUrl,
      registrableDomain: d.registrableDomain,
      latestScan: d.scans[0] ?? null,
      trend: [...d.scoreHistory].reverse(),
    })),
  }));
}

const scanReportInclude = {
  criterionResults: true,
  scoreHistory: true,
  diff: true,
  pages: { include: { issues: true } },
} satisfies Prisma.ScanInclude;

export type ScanReport = Prisma.ScanGetPayload<{ include: typeof scanReportInclude }>;

export function getScanReport(scanId: string): Promise<ScanReport | null> {
  return prisma.scan.findUnique({ where: { id: scanId }, include: scanReportInclude });
}

const domainScanSelect = {
  id: true, status: true, score: true, verdict: true,
  coverageRatio: true, pagesScanned: true, finishedAt: true, createdAt: true,
} satisfies Prisma.ScanSelect;

const domainOverviewInclude = {
  project: true,
  scans: { orderBy: { createdAt: "desc" }, select: domainScanSelect },
  scoreHistory: { orderBy: { capturedAt: "desc" }, take: 10, select: trendSelect },
} satisfies Prisma.DomainInclude;

export type DomainPage = Prisma.DomainGetPayload<{ include: typeof domainOverviewInclude }>;

export function getDomainOverview(domainId: string): Promise<DomainPage | null> {
  return prisma.domain.findUnique({ where: { id: domainId }, include: domainOverviewInclude });
}
