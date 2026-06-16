import { prisma } from "../client.js";
import type { AccessibilityStatement, ConformanceStatus, Prisma } from "@prisma/client";
import { draftStatement, type StatementDraft } from "@accessscan/report";

export interface StatementFields {
  conformanceStatus: ConformanceStatus;
  nonAccessibleContent: Prisma.InputJsonValue;
  method: string;
  feedbackContact: string | null;
  enforcementRoute: string | null;
  lastUpdated: Date | null;
  nextReviewDue: Date | null;
}

export function getStatement(domainId: string): Promise<AccessibilityStatement | null> {
  return prisma.accessibilityStatement.findUnique({ where: { domainId } });
}

export function upsertStatement(domainId: string, f: StatementFields): Promise<AccessibilityStatement> {
  return prisma.accessibilityStatement.upsert({ where: { domainId }, update: f, create: { domainId, ...f } });
}

export async function draftStatementForDomain(domainId: string): Promise<StatementDraft | null> {
  const scan = await prisma.scan.findFirst({
    where: { domainId, status: "DONE" },
    orderBy: { finishedAt: "desc" },
    include: { criterionResults: true, pages: { include: { issues: true } }, domain: true },
  });
  if (!scan) return null;
  return draftStatement({
    registrableDomain: scan.domain.registrableDomain,
    scanDate: scan.finishedAt ? scan.finishedAt.toISOString() : null,
    criteria: scan.criterionResults.map((c) => ({ wcagSc: c.wcagSc, state: c.state })),
    issues: scan.pages.flatMap((p) => p.issues.map((i) => ({ ruleId: i.ruleId, wcagSc: i.wcagSc }))),
    today: new Date(),
  });
}
