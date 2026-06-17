import { prisma } from "../client.js";
import type { Scan, DiscoveredVia, Impact, AuthState, Prisma } from "@prisma/client";

export interface IssueInput {
  ruleId: string;
  wcagSc: string | null;
  en301549Clause: string | null;
  impact: Impact | null;
  help: string;
  helpUrl: string;
  htmlSnippet: string;
  targetSelector: string;
  failureSummary: string;
  fingerprint: string;
}

export interface PageInput {
  url: string;
  httpStatus: number;
  depth: number;
  discoveredVia: DiscoveredVia;
  authState?: AuthState;
}

export function createScan(domainId: string): Promise<Scan> {
  return prisma.scan.create({ data: { domainId, status: "QUEUED" } });
}

export function markScanRunning(scanId: string, engineVersions: Record<string, unknown>): Promise<Scan> {
  return prisma.scan.update({
    where: { id: scanId },
    data: { status: "RUNNING", startedAt: new Date(), engineVersions: engineVersions as Prisma.InputJsonValue },
  });
}

export async function persistPageWithIssues(scanId: string, page: PageInput, issues: IssueInput[]): Promise<void> {
  const byFingerprint = new Map<string, { issue: IssueInput; count: number }>();
  for (const i of issues) {
    const e = byFingerprint.get(i.fingerprint);
    if (e) e.count += 1;
    else byFingerprint.set(i.fingerprint, { issue: i, count: 1 });
  }
  await prisma.page.create({
    data: {
      scanId,
      url: page.url,
      httpStatus: page.httpStatus,
      depth: page.depth,
      discoveredVia: page.discoveredVia,
      authState: page.authState ?? "ANON",
      scannedAt: new Date(),
      issues: {
        create: [...byFingerprint.values()].map(({ issue, count }) => ({
          scanId,
          ruleId: issue.ruleId,
          wcagSc: issue.wcagSc,
          en301549Clause: issue.en301549Clause,
          impact: issue.impact,
          help: issue.help,
          helpUrl: issue.helpUrl,
          htmlSnippet: issue.htmlSnippet,
          targetSelector: issue.targetSelector,
          failureSummary: issue.failureSummary,
          fingerprint: issue.fingerprint,
          occurrenceCount: count,
        })),
      },
    },
  });
}

export function markScanDone(scanId: string, pagesScanned: number): Promise<Scan> {
  return prisma.scan.update({
    where: { id: scanId },
    data: { status: "DONE", finishedAt: new Date(), pagesScanned },
  });
}

/** Mark FAILED only if still in flight — never overwrite a DONE or CANCELED scan. */
export async function markScanFailed(scanId: string): Promise<void> {
  await prisma.scan.updateMany({
    where: { id: scanId, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "FAILED", finishedAt: new Date() },
  });
}

export interface ScanProgress { phase?: string; pagesFound?: number; pagesScanned?: number; currentUrl?: string | null }

export function updateScanProgress(scanId: string, p: ScanProgress): Promise<unknown> {
  return prisma.scan.update({
    where: { id: scanId },
    data: {
      ...(p.phase !== undefined ? { phase: p.phase } : {}),
      ...(p.pagesFound !== undefined ? { pagesFound: p.pagesFound } : {}),
      ...(p.pagesScanned !== undefined ? { pagesScanned: p.pagesScanned } : {}),
      ...(p.currentUrl !== undefined ? { currentUrl: p.currentUrl } : {}),
    },
  });
}

export function requestScanCancel(scanId: string): Promise<unknown> {
  return prisma.scan.update({ where: { id: scanId }, data: { cancelRequested: true } });
}

export async function isScanCancelRequested(scanId: string): Promise<boolean> {
  const s = await prisma.scan.findUnique({ where: { id: scanId }, select: { cancelRequested: true } });
  return s?.cancelRequested ?? false;
}

export function markScanCanceled(scanId: string): Promise<unknown> {
  return prisma.scan.update({ where: { id: scanId }, data: { status: "CANCELED", finishedAt: new Date(), phase: null, currentUrl: null } });
}
