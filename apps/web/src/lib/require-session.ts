import { auth } from "./auth.js";

export class UnauthorizedError extends Error {}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError("Not authenticated");
  return session;
}

export async function requireAdminRole() {
  const session = await requireSession();
  if (session.user?.role !== "ADMIN") throw new UnauthorizedError("Admin role required");
  return session;
}
