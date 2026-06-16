import { prisma } from "../client.js";
import type { AccessibilityStatement, ConformanceStatus, Prisma } from "@prisma/client";

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
