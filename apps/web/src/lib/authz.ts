import type { Session } from "next-auth";
import { scanOwnerId, domainOwnerId, projectOwnerId } from "@accessscan/db";
import { requireSession } from "./require-session.js";

/** Caller is authenticated but does not own the resource. Mapped to 404 to avoid leaking existence. */
export class ForbiddenError extends Error {}

function ensure(ownerId: string | null, session: Session): Session {
  if (!ownerId || ownerId !== session.user?.id) throw new ForbiddenError("Not authorized");
  return session;
}

// Assert ownership for an already-resolved session (compose with requireAdminRole etc.).
export async function assertScanOwner(scanId: string, session: Session): Promise<void> {
  ensure(await scanOwnerId(scanId), session);
}
export async function assertDomainOwner(domainId: string, session: Session): Promise<void> {
  ensure(await domainOwnerId(domainId), session);
}
export async function assertProjectOwner(projectId: string, session: Session): Promise<void> {
  ensure(await projectOwnerId(projectId), session);
}

// Require an authenticated session AND ownership of the resource.
export async function requireScanOwner(scanId: string): Promise<Session> {
  return ensure(await scanOwnerId(scanId), await requireSession());
}
export async function requireDomainOwner(domainId: string): Promise<Session> {
  return ensure(await domainOwnerId(domainId), await requireSession());
}
export async function requireProjectOwner(projectId: string): Promise<Session> {
  return ensure(await projectOwnerId(projectId), await requireSession());
}
