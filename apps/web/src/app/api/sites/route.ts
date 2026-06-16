import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";
import { runScan } from "@accessscan/scanner";
import { handleAddSite } from "./handlers.js";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const { url } = (await req.json()) as { url?: string };
    const res = await handleAddSite(String(url ?? ""), session.user!.id, runScan);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
