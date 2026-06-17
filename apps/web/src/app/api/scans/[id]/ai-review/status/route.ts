import { NextResponse } from "next/server";
import { requireScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleAiReviewStatus } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireScanOwner(id);
    const res = await handleAiReviewStatus(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
