import { prisma } from "@accessscan/db";
import type { HandlerResult } from "../../../projects/handlers.js";

export async function handleGetScanStatus(scanId: string): Promise<HandlerResult<unknown>> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { id: true, status: true, score: true, verdict: true, finishedAt: true, pagesScanned: true },
  });
  if (!scan) return { status: 404, body: { error: "scan not found" } };
  return { status: 200, body: scan };
}
