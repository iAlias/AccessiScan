import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/require-session.js";
import { assertScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleReviewCriterion } from "../../../review/handlers.js";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; wcagSc: string }> }) {
  try {
    const session = await requireAdminRole();
    const { id, wcagSc } = await params;
    await assertScanOwner(id, session);
    const res = await handleReviewCriterion(id, wcagSc, await req.json(), session.user!.id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e, { adminGate: true });
  }
}
