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
  const requested = new Set(pageLevelScs);
  // Drop hallucinated / out-of-scope criteria the model may have invented.
  const verdicts = (await runBatch(provider, buildClusterPrompt(ctx, pageLevelScs))).filter((v) => requested.has(v.wcagSc));
  const result: ClusterVerdict[] = [];
  for (const v of verdicts) {
    if (v.verdict === "FAIL" && opts.verifyFails) {
      try {
        const refutation = (await runBatch(provider, buildVerifyPrompt(ctx, v))).find((r) => r.wcagSc === v.wcagSc);
        if (refutation && refutation.verdict !== "FAIL") {
          result.push({ ...v, verdict: "UNSURE", reasoning: `FAIL non confermato in verifica: ${refutation.reasoning}`, url: ctx.url });
          continue;
        }
      } catch {
        // verify failed (e.g. provider error) — keep the original FAIL rather than aborting the whole pass
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
  const requested = new Set(siteLevelScs);
  const verdicts = (await runBatch(provider, buildSitePrompt(samples, siteLevelScs))).filter((v) => requested.has(v.wcagSc));
  return verdicts.map((v) => ({ ...v, url: samples[0]!.url }));
}
