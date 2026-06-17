import { prisma, createScan, markScanFailed } from "@accessscan/db";
import type { HandlerResult } from "../../../projects/handlers.js";

export type RunScanFn = (scanId: string) => Promise<void>;

export async function handleTriggerScan(domainId: string, runScan: RunScanFn): Promise<HandlerResult<unknown>> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return { status: 404, body: { error: "domain not found" } };
  const scan = await createScan(domainId);
  // markScanFailed only transitions a still-in-flight scan, so a scan that was
  // cancelled or completed before a late rejection is never clobbered to FAILED.
  void runScan(scan.id).catch(() => {
    void markScanFailed(scan.id).catch(() => {});
  });
  return { status: 202, body: { scanId: scan.id } };
}

export async function handleListScans(domainId: string): Promise<HandlerResult<unknown>> {
  const scans = await prisma.scan.findMany({ where: { domainId }, orderBy: { createdAt: "desc" } });
  return { status: 200, body: scans };
}

export async function handleGetScan(scanId: string): Promise<HandlerResult<unknown>> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { criterionResults: true, scoreHistory: true, diff: true, pages: { include: { issues: true } } },
  });
  if (!scan) return { status: 404, body: { error: "scan not found" } };
  return { status: 200, body: scan };
}
