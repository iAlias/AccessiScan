import { prisma, upsertLoginRecipe, getLoginRecipe, deleteLoginRecipe } from "@accessscan/db";
import { loginRecipeSchema } from "@accessscan/validation";
import type { HandlerResult } from "../../../projects/handlers.js";

export async function handleUpsertLoginRecipe(domainId: string, input: unknown): Promise<HandlerResult<unknown>> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return { status: 404, body: { error: "domain not found" } };
  const parsed = loginRecipeSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  const recipe = await upsertLoginRecipe(domainId, parsed.data);
  return { status: 200, body: recipe };
}

export async function handleGetLoginRecipe(domainId: string): Promise<HandlerResult<unknown>> {
  const recipe = await getLoginRecipe(domainId);
  if (!recipe) return { status: 404, body: { error: "login recipe not found" } };
  return { status: 200, body: recipe };
}

export async function handleDeleteLoginRecipe(domainId: string): Promise<HandlerResult<unknown>> {
  const recipe = await getLoginRecipe(domainId);
  if (!recipe) return { status: 404, body: { error: "login recipe not found" } };
  await deleteLoginRecipe(domainId);
  return { status: 200, body: { ok: true } };
}
