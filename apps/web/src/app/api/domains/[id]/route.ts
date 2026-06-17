import { NextResponse } from "next/server";
import { deleteDomain } from "@accessscan/db";
import { requireDomainOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireDomainOwner(id);
    await deleteDomain(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return apiError(e);
  }
}
