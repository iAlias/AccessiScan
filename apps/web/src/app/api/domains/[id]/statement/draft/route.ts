import { NextResponse } from "next/server";
import { requireDomainOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleDraftStatement } from "../handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireDomainOwner(id);
    const res = await handleDraftStatement(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
