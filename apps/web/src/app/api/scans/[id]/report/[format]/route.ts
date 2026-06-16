import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/require-session.js";
import { handleExportReport } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; format: string }> }) {
  try {
    await requireSession();
    const { id, format } = await params;
    const res = await handleExportReport(id, format);
    if (res.status !== 200) return NextResponse.json(JSON.parse(res.body as string), { status: res.status });
    const body = Buffer.isBuffer(res.body) ? new Uint8Array(res.body) : res.body;
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": res.contentType,
        "content-disposition": `attachment; filename="${res.filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }
}
