import type { ZodSchema } from "zod";
import { LlmError, type LlmProvider, type LlmRequest } from "./provider.js";

export interface AnthropicOpts {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fenced ? fenced[1]! : text).trim());
}

export function anthropicProvider(opts: AnthropicOpts, fetchImpl: typeof fetch = fetch): LlmProvider {
  const base = opts.baseUrl ?? "https://api.anthropic.com";
  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  return {
    async evaluate(req: LlmRequest) {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetchImpl(`${base}/v1/messages`, {
            method: "POST",
            signal: ctrl.signal,
            headers: {
              "content-type": "application/json",
              "anthropic-version": "2023-06-01",
              ...(opts.apiKey ? { "x-api-key": opts.apiKey } : {}),
            },
            body: JSON.stringify({
              model: opts.model,
              max_tokens: 4096,
              temperature: 0,
              system: `${req.system}\nReply with ONLY a JSON object, no prose.`,
              messages: [{ role: "user", content: req.user }],
            }),
          });
          if (!res.ok) throw new LlmError(`anthropic HTTP ${res.status}`);
          const data = (await res.json()) as { content?: Array<{ text?: string }> };
          const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
          const parsed = (req.schema as ZodSchema).safeParse(extractJson(text));
          if (!parsed.success) throw new LlmError(`schema validation failed: ${parsed.error.message}`);
          return parsed.data;
        } catch (e) {
          lastErr = e;
        } finally {
          clearTimeout(timer);
        }
      }
      throw new LlmError(`anthropic failed after ${maxRetries + 1} attempts: ${String(lastErr)}`);
    },
  };
}
