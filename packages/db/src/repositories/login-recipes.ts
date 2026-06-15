import { prisma } from "../client.js";
import type { LoginRecipe, Prisma } from "@prisma/client";

export interface LoginStepInput { action: "fill" | "click"; selector: string; valueRef?: string; }
export interface WaitForInput { type: "selector" | "urlContains"; value: string; }
export interface LoginRecipeInput {
  loginUrl: string;
  steps: LoginStepInput[];
  waitFor: WaitForInput;
  successCheck: WaitForInput;
}

export function upsertLoginRecipe(domainId: string, input: LoginRecipeInput): Promise<LoginRecipe> {
  const data = {
    loginUrl: input.loginUrl,
    steps: input.steps as unknown as Prisma.InputJsonValue,
    waitFor: input.waitFor as unknown as Prisma.InputJsonValue,
    successCheck: input.successCheck as unknown as Prisma.InputJsonValue,
  };
  return prisma.loginRecipe.upsert({
    where: { domainId },
    update: data,
    create: { domainId, ...data },
  });
}

export function getLoginRecipe(domainId: string): Promise<LoginRecipe | null> {
  return prisma.loginRecipe.findUnique({ where: { domainId } });
}

export function deleteLoginRecipe(domainId: string): Promise<LoginRecipe> {
  return prisma.loginRecipe.delete({ where: { domainId } });
}
