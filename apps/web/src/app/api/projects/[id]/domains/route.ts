import { NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleCreateDomain, handleListDomains } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireProjectOwner(id);
    const res = await handleListDomains(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireProjectOwner(id);
    const res = await handleCreateDomain(id, await req.json());
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
