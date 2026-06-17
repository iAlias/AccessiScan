import { NextResponse } from "next/server";
import { requireScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleGetPageIssues } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  try {
    const { id, pageId } = await params;
    await requireScanOwner(id);
    const res = await handleGetPageIssues(id, pageId);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
