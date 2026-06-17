import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session.js";
import { apiError } from "@/lib/api-error.js";
import { runScan } from "@accessscan/scanner";
import { handleAddSite } from "./handlers.js";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const { url } = (await req.json()) as { url?: string };
    const res = await handleAddSite(String(url ?? ""), session.user!.id, runScan);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
