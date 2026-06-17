import { NextResponse } from "next/server";
import { requireDomainOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleUpsertLoginRecipe, handleGetLoginRecipe, handleDeleteLoginRecipe } from "./handlers.js";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireDomainOwner(id);
    const res = await handleUpsertLoginRecipe(id, await req.json());
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireDomainOwner(id);
    const res = await handleGetLoginRecipe(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireDomainOwner(id);
    const res = await handleDeleteLoginRecipe(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
