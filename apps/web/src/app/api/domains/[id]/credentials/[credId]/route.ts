import { NextResponse } from "next/server";
import { requireDomainOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleDeleteCredential } from "../handlers.js";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; credId: string }> }) {
  try {
    const { id, credId } = await params;
    await requireDomainOwner(id);
    const res = await handleDeleteCredential(id, credId);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
