import type { LlmProvider } from "./provider.js";
import { aiVerdictSchema, type PageContext, type CriterionVerdict } from "./types.js";
import { buildClusterPrompt, buildSitePrompt, buildVerifyPrompt } from "./prompt.js";
import type { ClusterVerdict } from "./aggregate.js";

async function runBatch(provider: LlmProvider, prompt: { system: string; user: string }): Promise<CriterionVerdict[]> {
  const out = (await provider.evaluate({ ...prompt, schema: aiVerdictSchema })) as { verdicts: CriterionVerdict[] };
  return out.verdicts;
}

export async function evaluateCluster(
  provider: LlmProvider,
  ctx: PageContext,
  pageLevelScs: string[],
  opts: { verifyFails: boolean },
): Promise<ClusterVerdict[]> {
  const verdicts = await runBatch(provider, buildClusterPrompt(ctx, pageLevelScs));
  const result: ClusterVerdict[] = [];
  for (const v of verdicts) {
    if (v.verdict === "FAIL" && opts.verifyFails) {
      const [refutation] = await runBatch(provider, buildVerifyPrompt(ctx, v));
      if (refutation && refutation.verdict !== "FAIL") {
        result.push({ ...v, verdict: "UNSURE", reasoning: `FAIL non confermato in verifica: ${refutation.reasoning}`, url: ctx.url });
        continue;
      }
    }
    result.push({ ...v, url: ctx.url });
  }
  return result;
}

export async function evaluateSite(
  provider: LlmProvider,
  samples: PageContext[],
  siteLevelScs: string[],
): Promise<ClusterVerdict[]> {
  if (siteLevelScs.length === 0 || samples.length === 0) return [];
  const verdicts = await runBatch(provider, buildSitePrompt(samples, siteLevelScs));
  return verdicts.map((v) => ({ ...v, url: samples[0]!.url }));
}
