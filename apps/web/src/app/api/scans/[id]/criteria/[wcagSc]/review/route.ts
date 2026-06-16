import { NextResponse } from "next/server";
import { requireAdminRole, UnauthorizedError } from "@/lib/require-session.js";
import { handleReviewCriterion } from "../../../review/handlers.js";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; wcagSc: string }> }) {
  try {
    const session = await requireAdminRole();
    const { id, wcagSc } = await params;
    const res = await handleReviewCriterion(id, wcagSc, await req.json(), session.user!.id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
}
