import type { ZodSchema } from "zod";
import { anthropicProvider } from "./provider-anthropic.js";
import { openAiCompatibleProvider } from "./provider-openai.js";

export interface LlmRequest {
  system: string;
  user: string;
  schema: ZodSchema;
}

export interface LlmProvider {
  /** Run the model; return the parsed+validated JSON or throw. */
  evaluate(req: LlmRequest): Promise<unknown>;
}

export class LlmError extends Error {}

/** Deterministic provider for tests — validates the canned value against the schema. */
export function fakeProvider(canned: unknown): LlmProvider {
  return {
    async evaluate(req: LlmRequest) {
      const parsed = req.schema.safeParse(canned);
      if (!parsed.success) throw new LlmError(`fake output failed schema: ${parsed.error.message}`);
      return parsed.data;
    },
  };
}

export interface ProviderConfig {
  provider: "anthropic" | "openai-compatible";
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export function readProviderConfig(env: NodeJS.ProcessEnv): ProviderConfig {
  const provider = (env.AI_PROVIDER ?? "anthropic") as ProviderConfig["provider"];
  return {
    provider,
    model: env.AI_MODEL ?? (provider === "anthropic" ? "claude-sonnet-4-6" : "grok-2"),
    baseUrl: env.AI_BASE_URL,
    apiKey: env.AI_API_KEY,
  };
}

export function createProviderFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const cfg = readProviderConfig(env);
  if (cfg.provider === "anthropic") return anthropicProvider({ model: cfg.model, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
  return openAiCompatibleProvider({ model: cfg.model, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
}
