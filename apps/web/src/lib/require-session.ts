import { redirect } from "next/navigation";
import { auth } from "./auth.js";
import { prisma } from "@accessscan/db";
import type { Session } from "next-auth";

export class UnauthorizedError extends Error {}

/**
 * Returns the real NextAuth session, or — ONLY in development — a synthetic session
 * for the demo admin so local `next dev` lands authenticated without the login form.
 * Never fabricates a session in production (or under test).
 */
export async function resolveSession(): Promise<Session | null> {
  const session = await auth();
  if (session?.user) return session;
  if (process.env.NODE_ENV === "development") {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
    if (admin) {
      return { user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }, expires: "" } as unknown as Session;
    }
  }
  return session;
}

export async function requireSession() {
  const session = await resolveSession();
  if (!session?.user) throw new UnauthorizedError("Not authenticated");
  return session;
}

export async function requireAdminRole() {
  const session = await requireSession();
  if (session.user?.role !== "ADMIN") throw new UnauthorizedError("Admin role required");
  return session;
}

/** For server components: redirect to /login instead of throwing (which would 500). */
export async function requirePageSession(): Promise<Session> {
  const session = await resolveSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdminPage(): Promise<Session> {
  const session = await requirePageSession();
  if (session.user?.role !== "ADMIN") redirect("/");
  return session;
}
