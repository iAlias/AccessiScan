import { z } from "zod";

export type AiVerdict = "PASS" | "FAIL" | "UNSURE";

export const criterionVerdictSchema = z.object({
  wcagSc: z.string(),
  verdict: z.enum(["PASS", "FAIL", "UNSURE"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  evidenceSelector: z.string().optional(),
});
export type CriterionVerdict = z.infer<typeof criterionVerdictSchema>;

export const aiVerdictSchema = z.object({
  verdicts: z.array(criterionVerdictSchema),
});
export type AiVerdictBatch = z.infer<typeof aiVerdictSchema>;

/** One page selected to represent a cluster of structurally-similar pages. */
export interface PageRef {
  id: string;
  url: string;
  ruleIds: string[]; // axe ruleIds present on the page
}

export interface PageCluster {
  key: string;
  representative: PageRef;
  size: number; // number of pages in the cluster
}

/** Per-page rendered context fed to the LLM. */
export interface PageContext {
  url: string;
  a11yTree: string;
  domExcerpt: string;
  axeFindings: Array<{ ruleId: string; impact: string | null; help: string | null; targetSelector: string }>;
}

/** Final aggregated suggestion persisted per criterion. */
export interface AiSuggestion {
  wcagSc: string;
  verdict: AiVerdict;
  confidence: number;
  reasoning: string;
  evidence: string | null; // "url — selector"
}

/** Storage state passed to Playwright for authenticated capture. */
export type StorageStateLike = NonNullable<Parameters<import("playwright").Browser["newContext"]>[0]>["storageState"];
