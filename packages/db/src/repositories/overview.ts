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
  latestScan: LatestScan | null; // latest COMPLETED scan — drives the headline score/verdict
  pendingStatus: LatestScan["status"] | null; // status of the newest scan when it isn't DONE (RUNNING/FAILED/CANCELED)
  trend: TrendPoint[]; // ascending capturedAt
}
export interface ProjectOverview {
  id: string;
  name: string;
  domains: DomainOverview[];
}

export async function getOverview(ownerId: string): Promise<ProjectOverview[]> {
  const projects = await prisma.project.findMany({
    where: { ownerId },
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
  // Find each domain's latest COMPLETED scan with a query that is NOT bounded to a
  // recent-scans window — a burst of failed/cancelled attempts must not hide it.
  const domainIds = projects.flatMap((p) => p.domains.map((d) => d.id));
  const latestDone = domainIds.length
    ? await prisma.scan.findMany({
        where: { domainId: { in: domainIds }, status: "DONE" },
        orderBy: { createdAt: "desc" },
        distinct: ["domainId"],
        select: { ...latestScanSelect, domainId: true },
      })
    : [];
  const doneByDomain = new Map(latestDone.map((s) => [s.domainId, s]));
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    domains: p.domains.map((d) => {
      const newest = d.scans[0] ?? null;
      return {
        id: d.id,
        baseUrl: d.baseUrl,
        registrableDomain: d.registrableDomain,
        latestScan: doneByDomain.get(d.id) ?? null, // headline = last completed scan, never a cancelled/running one
        pendingStatus: newest && newest.status !== "DONE" ? newest.status : null,
        trend: [...d.scoreHistory].reverse(),
      };
    }),
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

const domainOverviewInclude = {
  project: true,
  scans: { orderBy: { createdAt: "desc" }, take: 50, select: latestScanSelect },
  scoreHistory: { orderBy: { capturedAt: "desc" }, take: 10, select: trendSelect },
} satisfies Prisma.DomainInclude;

export type DomainPage = Prisma.DomainGetPayload<{ include: typeof domainOverviewInclude }>;

export function getDomainOverview(domainId: string): Promise<DomainPage | null> {
  return prisma.domain.findUnique({ where: { id: domainId }, include: domainOverviewInclude });
}
