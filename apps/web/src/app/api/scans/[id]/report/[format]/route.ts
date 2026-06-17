import { NextResponse } from "next/server";
import { requireScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleExportReport } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; format: string }> }) {
  try {
    const { id, format } = await params;
    await requireScanOwner(id);
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
    return apiError(e);
  }
}
