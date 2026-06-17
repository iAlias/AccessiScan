import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/require-session.js";
import { assertScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleGetReview } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole();
    const { id } = await params;
    await assertScanOwner(id, session);
    const res = await handleGetReview(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e, { adminGate: true });
  }
}
