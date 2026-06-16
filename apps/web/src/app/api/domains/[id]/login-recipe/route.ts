import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";
import { handleUpsertLoginRecipe, handleGetLoginRecipe, handleDeleteLoginRecipe } from "./handlers.js";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const res = await handleUpsertLoginRecipe(id, await req.json());
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const res = await handleGetLoginRecipe(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const res = await handleDeleteLoginRecipe(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
