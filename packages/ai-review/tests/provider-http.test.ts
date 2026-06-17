import { expect, test, vi } from "vitest";
import { openAiCompatibleProvider } from "../src/provider-openai.js";
import { aiVerdictSchema } from "../src/types.js";

function jsonResponse(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });
}

test("openai-compatible provider parses JSON content and validates it", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(JSON.stringify({ verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.9, reasoning: "ok" }] })));
  const provider = openAiCompatibleProvider({ model: "m", baseUrl: "https://x/v1", apiKey: "k" }, fetchMock as unknown as typeof fetch);
  const out = await provider.evaluate({ system: "s", user: "u", schema: aiVerdictSchema });
  expect((out as { verdicts: unknown[] }).verdicts).toHaveLength(1);
  const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
  expect(body.model).toBe("m");
  expect(body.messages[0].role).toBe("system");
});

test("retries once on malformed JSON then throws", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(jsonResponse("not json"))
    .mockResolvedValueOnce(jsonResponse("still not json"));
  const provider = openAiCompatibleProvider({ model: "m", baseUrl: "https://x/v1", apiKey: "k", maxRetries: 1 }, fetchMock as unknown as typeof fetch);
  await expect(provider.evaluate({ system: "s", user: "u", schema: aiVerdictSchema })).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
