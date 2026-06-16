import { prisma, getStatement, upsertStatement, draftStatementForDomain } from "@accessscan/db";
import { statementSchema } from "@accessscan/validation";
import type { HandlerResult } from "../../../projects/handlers.js";

export async function handleGetStatement(domainId: string): Promise<HandlerResult<unknown>> {
  const s = await getStatement(domainId);
  if (!s) return { status: 404, body: { error: "statement not found" } };
  return { status: 200, body: s };
}

export async function handleDraftStatement(domainId: string): Promise<HandlerResult<unknown>> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return { status: 404, body: { error: "domain not found" } };
  const draft = await draftStatementForDomain(domainId);
  if (!draft) return { status: 404, body: { error: "no completed scan" } };
  return { status: 200, body: draft };
}

export async function handlePutStatement(domainId: string, input: unknown): Promise<HandlerResult<unknown>> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return { status: 404, body: { error: "domain not found" } };
  const parsed = statementSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  const now = new Date();
  const nextReviewDue = new Date(now);
  nextReviewDue.setUTCFullYear(now.getUTCFullYear() + 1);
  const saved = await upsertStatement(domainId, {
    conformanceStatus: parsed.data.conformanceStatus,
    nonAccessibleContent: parsed.data.nonAccessibleContent,
    method: "autovalutazione automatizzata",
    feedbackContact: parsed.data.feedbackContact ?? null,
    enforcementRoute: parsed.data.enforcementRoute ?? null,
    lastUpdated: now,
    nextReviewDue,
  });
  return { status: 200, body: saved };
}
