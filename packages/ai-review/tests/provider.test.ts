import { expect, test } from "vitest";
import { fakeProvider } from "../src/provider.js";
import { aiVerdictSchema } from "../src/types.js";

test("fakeProvider returns the canned object validated against the schema", async () => {
  const provider = fakeProvider({ verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.9, reasoning: "ok" }] });
  const out = await provider.evaluate({ system: "s", user: "u", schema: aiVerdictSchema });
  expect((out as { verdicts: unknown[] }).verdicts).toHaveLength(1);
});

test("fakeProvider throws when the canned value violates the schema", async () => {
  const provider = fakeProvider({ verdicts: [{ wcagSc: "2.4.6", verdict: "NOPE", confidence: 0.9, reasoning: "ok" }] });
  await expect(provider.evaluate({ system: "s", user: "u", schema: aiVerdictSchema })).rejects.toThrow();
});
