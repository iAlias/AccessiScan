import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";
import { handleGetPageIssues } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  try {
    await requireSession();
    const { id, pageId } = await params;
    const res = await handleGetPageIssues(id, pageId);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
