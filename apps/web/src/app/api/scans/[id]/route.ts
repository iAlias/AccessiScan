import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";
import { handleGetScan } from "../../domains/[id]/scans/handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const res = await handleGetScan(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
