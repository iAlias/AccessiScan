import { NextResponse } from "next/server";
import { requireDomainOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleGetStatement, handlePutStatement } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireDomainOwner(id);
    const res = await handleGetStatement(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireDomainOwner(id);
    const res = await handlePutStatement(id, await req.json());
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
