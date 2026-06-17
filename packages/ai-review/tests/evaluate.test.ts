import { expect, test } from "vitest";
import { evaluateCluster } from "../src/evaluate.js";
import { fakeProvider } from "../src/provider.js";
import type { PageContext } from "../src/types.js";

const ctx: PageContext = { url: "https://a.it/p", a11yTree: "T", domExcerpt: "D", axeFindings: [] };

test("evaluateCluster returns cluster verdicts tagged with the page url", async () => {
  const provider = fakeProvider({ verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.9, reasoning: "ok" }] });
  const out = await evaluateCluster(provider, ctx, ["2.4.6"], { verifyFails: false });
  expect(out[0]!.url).toBe("https://a.it/p");
  expect(out[0]!.verdict).toBe("PASS");
});

test("a FAIL refuted by the verify pass is downgraded to UNSURE", async () => {
  // first call: FAIL; verify call: PASS (refutes) → downgraded
  let call = 0;
  const provider = {
    async evaluate() {
      call++;
      return call === 1
        ? { verdicts: [{ wcagSc: "2.4.6", verdict: "FAIL", confidence: 0.8, reasoning: "bad" }] }
        : { verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.7, reasoning: "actually fine" }] };
    },
  };
  const out = await evaluateCluster(provider, ctx, ["2.4.6"], { verifyFails: true });
  expect(out[0]!.verdict).toBe("UNSURE");
});
