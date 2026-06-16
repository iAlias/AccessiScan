import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";
import { handleGetStatement, handlePutStatement } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const res = await handleGetStatement(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const res = await handlePutStatement(id, await req.json());
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
