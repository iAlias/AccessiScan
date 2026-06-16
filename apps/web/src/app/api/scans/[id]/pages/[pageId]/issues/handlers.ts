import { getPageIssues } from "@accessscan/db";
import type { HandlerResult } from "../../../../../projects/handlers.js";

export async function handleGetPageIssues(scanId: string, pageId: string): Promise<HandlerResult<unknown>> {
  const issues = await getPageIssues(scanId, pageId);
  return { status: 200, body: { issues } };
}
