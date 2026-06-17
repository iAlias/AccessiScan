import type { LlmProvider } from "./provider.js";
import type { PageRef, PageContext, AiSuggestion } from "./types.js";
import { clusterPages } from "./cluster.js";
import { criterionScope, isInScope } from "./criteria.js";
import { evaluateCluster, evaluateSite } from "./evaluate.js";
import { aggregateSuggestions, type ClusterVerdict } from "./aggregate.js";

export interface RunStatus { phase: string; clustersDone: number; clustersTotal: number }

export interface AiReviewDeps {
  provider: LlmProvider;
  loadPages: (scanId: string) => Promise<PageRef[]>;
  pendingCriteria: (scanId: string) => Promise<string[]>; // wcagSc currently NEEDS_MANUAL_REVIEW
  capture: (url: string, axe: PageContext["axeFindings"]) => Promise<PageContext>;
  persist: (scanId: string, suggestions: AiSuggestion[]) => Promise<void>;
  setStatus: (s: RunStatus) => void;
  shouldCancel: () => Promise<boolean>;
  maxClusters: number;
  confidenceThreshold: number;
}

export async function runAiReview(scanId: string, deps: AiReviewDeps): Promise<void> {
  const pages = await deps.loadPages(scanId);
  const pending = (await deps.pendingCriteria(scanId)).filter(isInScope);
  if (pending.length === 0 || pages.length === 0) { await deps.persist(scanId, []); return; }
  if (await deps.shouldCancel()) return;

  const clusters = clusterPages(pages, deps.maxClusters);
  const pageScs = pending.filter((sc) => criterionScope(sc) === "page");
  const siteScs = pending.filter((sc) => criterionScope(sc) === "site");

  deps.setStatus({ phase: "evaluate", clustersDone: 0, clustersTotal: clusters.length });
  const contexts: PageContext[] = [];
  const all: ClusterVerdict[] = [];
  for (let i = 0; i < clusters.length; i++) {
    if (await deps.shouldCancel()) return;
    let ctx: PageContext;
    try { ctx = await deps.capture(clusters[i]!.representative.url, []); }
    catch { deps.setStatus({ phase: "evaluate", clustersDone: i + 1, clustersTotal: clusters.length }); continue; }
    contexts.push(ctx);
    const verdicts = await evaluateCluster(deps.provider, ctx, pageScs, { verifyFails: true });
    all.push(...verdicts);
    deps.setStatus({ phase: "evaluate", clustersDone: i + 1, clustersTotal: clusters.length });
  }

  if (await deps.shouldCancel()) return;
  if (siteScs.length > 0 && contexts.length > 0) {
    deps.setStatus({ phase: "site", clustersDone: clusters.length, clustersTotal: clusters.length });
    all.push(...(await evaluateSite(deps.provider, contexts, siteScs)));
  }

  const suggestions = aggregateSuggestions(all, deps.confidenceThreshold);
  await deps.persist(scanId, suggestions);
}
