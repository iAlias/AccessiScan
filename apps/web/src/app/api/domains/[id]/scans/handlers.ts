import { prisma, createScan } from "@accessscan/db";
import type { HandlerResult } from "../../../projects/handlers.js";

export type RunScanFn = (scanId: string) => Promise<void>;

export async function handleTriggerScan(domainId: string, runScan: RunScanFn): Promise<HandlerResult<unknown>> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return { status: 404, body: { error: "domain not found" } };
  const scan = await createScan(domainId);
  void runScan(scan.id).catch(() => {
    void prisma.scan.update({ where: { id: scan.id }, data: { status: "FAILED" } }).catch(() => {});
  });
  return { status: 202, body: { scanId: scan.id } };
}

export async function handleListScans(domainId: string): Promise<HandlerResult<unknown>> {
  const scans = await prisma.scan.findMany({ where: { domainId }, orderBy: { createdAt: "desc" } });
  return { status: 200, body: scans };
}
