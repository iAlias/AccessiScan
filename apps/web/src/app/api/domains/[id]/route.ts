import { NextResponse } from "next/server";
import { prisma, deleteDomain } from "@accessscan/db";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) return NextResponse.json({ error: "domain not found" }, { status: 404 });
    await deleteDomain(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
