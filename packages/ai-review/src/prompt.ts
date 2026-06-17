import type { PageContext, CriterionVerdict } from "./types.js";
import { criterionRubric } from "./criteria.js";

const SYSTEM = `You are a WCAG 2.1 AA accessibility auditor. Judge each listed success criterion for the given page using its rendered accessibility tree, a DOM excerpt and the automated (axe) findings. For each criterion return verdict PASS (clearly met), FAIL (clearly violated, cite a selector) or UNSURE (cannot tell from this evidence). Be conservative: prefer UNSURE over guessing. Reply with ONLY a JSON object: {"verdicts":[{"wcagSc","verdict","confidence":0..1,"reasoning","evidenceSelector"}]}.`;

function rubricBlock(scs: string[]): string {
  return scs.map((sc) => `- ${sc}: ${criterionRubric(sc)}`).join("\n");
}

function contextBlock(ctx: PageContext): string {
  const findings = ctx.axeFindings.map((f) => `  ${f.ruleId} [${f.impact ?? "?"}] ${f.targetSelector}`).join("\n");
  return `PAGE: ${ctx.url}\n\nACCESSIBILITY TREE:\n${ctx.a11yTree}\n\nDOM EXCERPT:\n${ctx.domExcerpt}\n\nAXE FINDINGS:\n${findings || "  (none)"}`;
}

export function buildClusterPrompt(ctx: PageContext, pageLevelScs: string[]): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `${contextBlock(ctx)}\n\nEVALUATE THESE CRITERIA:\n${rubricBlock(pageLevelScs)}`,
  };
}

export function buildSitePrompt(samples: PageContext[], siteLevelScs: string[]): { system: string; user: string } {
  const blocks = samples.map((s, i) => `--- SAMPLE ${i + 1} ---\n${contextBlock(s)}`).join("\n\n");
  return {
    system: SYSTEM,
    user: `These pages represent the whole site.\n\n${blocks}\n\nEVALUATE THESE SITE-WIDE CRITERIA:\n${rubricBlock(siteLevelScs)}`,
  };
}

export function buildVerifyPrompt(ctx: PageContext, claim: CriterionVerdict): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `${contextBlock(ctx)}\n\nA prior reviewer claimed criterion ${claim.wcagSc} FAILS: "${claim.reasoning}". Try to REFUTE this. Return a single-element verdicts array: PASS if the claim is wrong, FAIL only if you can confirm it, UNSURE if uncertain.`,
  };
}
