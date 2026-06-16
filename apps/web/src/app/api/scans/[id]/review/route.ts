import { NextResponse } from "next/server";
import { requireAdminRole, UnauthorizedError } from "@/lib/require-session.js";
import { handleGetReview } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminRole();
    const { id } = await params;
    const res = await handleGetReview(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
}
