import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/require-session.js";
import { assertScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { requestAiReviewCancel } from "@accessscan/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole();
    const { id } = await params;
    await assertScanOwner(id, session);
    await requestAiReviewCancel(id);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return apiError(e, { adminGate: true });
  }
}
