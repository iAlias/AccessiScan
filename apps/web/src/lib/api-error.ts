import { NextResponse } from "next/server";
import { UnauthorizedError } from "./require-session.js";
import { ForbiddenError } from "./authz.js";

/**
 * Maps known auth errors to HTTP responses; rethrows anything else.
 * Ownership failures return 404 (not 403) so a resource's existence is not leaked.
 * Pass `adminGate` for routes gated on the ADMIN role (auth failure → 403).
 */
export function apiError(e: unknown, opts?: { adminGate?: boolean }): NextResponse {
  // Malformed JSON body (req.json() throws SyntaxError) → 400, not 500.
  if (e instanceof SyntaxError) return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  if (e instanceof ForbiddenError) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (e instanceof UnauthorizedError) {
    return opts?.adminGate
      ? NextResponse.json({ error: "forbidden" }, { status: 403 })
      : NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  throw e;
}
