import { prisma, requestScanCancel } from "@accessscan/db";
import type { HandlerResult } from "../../../projects/handlers.js";

export async function handleCancelScan(scanId: string): Promise<HandlerResult<unknown>> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { status: true } });
  if (!scan) return { status: 404, body: { error: "scan not found" } };
  if (scan.status !== "RUNNING" && scan.status !== "QUEUED") {
    return { status: 409, body: { error: "scan not cancellable", status: scan.status } };
  }
  await requestScanCancel(scanId);
  return { status: 202, body: { ok: true } };
}
