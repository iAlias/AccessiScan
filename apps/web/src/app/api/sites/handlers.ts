import { prisma, createProject, createDomain, createScan, markScanFailed } from "@accessscan/db";
import { createDomainSchema } from "@accessscan/validation";
import type { HandlerResult } from "../projects/handlers.js";

export type RunScanFn = (scanId: string) => Promise<void>;

export async function handleAddSite(url: string, ownerId: string, runScan: RunScanFn): Promise<HandlerResult<unknown>> {
  const parsed = createDomainSchema.safeParse({ baseUrl: url });
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  let project = await prisma.project.findFirst({ where: { ownerId }, orderBy: { createdAt: "asc" } });
  if (!project) project = await createProject({ name: "I miei siti", ownerId });
  const domain = await createDomain({ projectId: project.id, baseUrl: parsed.data.baseUrl });
  const scan = await createScan(domain.id);
  // markScanFailed only transitions a still-in-flight scan, so a late rejection
  // can't clobber a DONE/CANCELED scan.
  void Promise.resolve(runScan(scan.id)).catch(() => { void markScanFailed(scan.id).catch(() => {}); });
  return { status: 202, body: { domainId: domain.id, scanId: scan.id } };
}
