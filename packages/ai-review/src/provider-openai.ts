import type { ZodSchema } from "zod";
import { LlmError, type LlmProvider, type LlmRequest } from "./provider.js";

export interface OpenAiOpts {
  model: string;
  baseUrl?: string; // default OpenAI; for Grok/Groq/Ollama set this
  apiKey?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  return JSON.parse(raw.trim());
}

function validate(schema: ZodSchema, value: unknown): unknown {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new LlmError(`schema validation failed: ${parsed.error.message}`);
  return parsed.data;
}

export function openAiCompatibleProvider(opts: OpenAiOpts, fetchImpl: typeof fetch = fetch): LlmProvider {
  const base = opts.baseUrl ?? "https://api.openai.com/v1";
  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  return {
    async evaluate(req: LlmRequest) {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetchImpl(`${base}/chat/completions`, {
            method: "POST",
            signal: ctrl.signal,
            headers: { "content-type": "application/json", ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}) },
            body: JSON.stringify({
              model: opts.model,
              messages: [{ role: "system", content: req.system }, { role: "user", content: req.user }],
              response_format: { type: "json_object" },
              temperature: 0,
            }),
          });
          if (!res.ok) throw new LlmError(`provider HTTP ${res.status}`);
          const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const content = data.choices?.[0]?.message?.content ?? "";
          return validate(req.schema, extractJson(content));
        } catch (e) {
          lastErr = e;
        } finally {
          clearTimeout(timer);
        }
      }
      throw new LlmError(`provider failed after ${maxRetries + 1} attempts: ${String(lastErr)}`);
    },
  };
}
