import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session.js";
import { apiError } from "@/lib/api-error.js";
import { handleCreateProject, handleListProjects } from "./handlers.js";

export async function GET() {
  try {
    const session = await requireSession();
    const res = await handleListProjects(session.user!.id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const res = await handleCreateProject(body, session.user!.id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
