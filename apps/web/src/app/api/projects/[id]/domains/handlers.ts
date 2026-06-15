import { createDomain, listDomains } from "@accessscan/db";
import { createDomainSchema } from "@accessscan/validation";
import type { HandlerResult } from "../../handlers.js";

export async function handleCreateDomain(
  projectId: string,
  input: unknown,
): Promise<HandlerResult<unknown>> {
  const parsed = createDomainSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  const domain = await createDomain({ projectId, ...parsed.data });
  return { status: 201, body: domain };
}

export async function handleListDomains(projectId: string): Promise<HandlerResult<unknown>> {
  return { status: 200, body: await listDomains(projectId) };
}
