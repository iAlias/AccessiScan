import { prisma } from "../client.js";

// Ownership resolvers: every resource ultimately belongs to a User via
// Project.ownerId. These return the owning user id (or null when the resource
// does not exist) so the web layer can enforce horizontal authorization.

export async function projectOwnerId(projectId: string): Promise<string | null> {
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  return p?.ownerId ?? null;
}

export async function domainOwnerId(domainId: string): Promise<string | null> {
  const d = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { project: { select: { ownerId: true } } },
  });
  return d?.project.ownerId ?? null;
}

export async function scanOwnerId(scanId: string): Promise<string | null> {
  const s = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { domain: { select: { project: { select: { ownerId: true } } } } },
  });
  return s?.domain.project.ownerId ?? null;
}
