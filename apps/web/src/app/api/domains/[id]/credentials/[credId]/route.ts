import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";
import { handleDeleteCredential } from "../handlers.js";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; credId: string }> }) {
  try {
    await requireSession();
    const { id, credId } = await params;
    const res = await handleDeleteCredential(id, credId);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
