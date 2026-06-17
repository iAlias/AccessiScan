import { expect, test, vi } from "vitest";
import { runAiReview } from "../src/run.js";
import { fakeProvider } from "../src/provider.js";
import type { PageRef, PageContext, AiSuggestion } from "../src/types.js";

test("runAiReview clusters, evaluates, aggregates and persists suggestions", async () => {
  const pages: PageRef[] = [
    { id: "1", url: "https://a.it/p/1", ruleIds: ["image-alt"] },
    { id: "2", url: "https://a.it/p/2", ruleIds: ["image-alt"] },
  ];
  const persisted: AiSuggestion[] = [];
  await runAiReview("scan1", {
    provider: fakeProvider({ verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.9, reasoning: "ok" }] }),
    loadPages: async () => pages,
    pendingCriteria: async () => ["2.4.6", "2.4.5"],
    capture: async (url): Promise<PageContext> => ({ url, a11yTree: "T", domExcerpt: "D", axeFindings: [] }),
    persist: async (_scanId, suggestions) => { persisted.push(...suggestions); },
    setStatus: vi.fn(),
    shouldCancel: async () => false,
    maxClusters: 8,
    confidenceThreshold: 0.7,
  });
  expect(persisted.some((s) => s.wcagSc === "2.4.6")).toBe(true);
});

test("runAiReview stops early when cancelled before evaluation", async () => {
  const persist = vi.fn();
  await runAiReview("scan1", {
    provider: fakeProvider({ verdicts: [] }),
    loadPages: async () => [{ id: "1", url: "https://a.it/p/1", ruleIds: [] }],
    pendingCriteria: async () => ["2.4.6"],
    capture: async (url) => ({ url, a11yTree: "T", domExcerpt: "D", axeFindings: [] }),
    persist,
    setStatus: vi.fn(),
    shouldCancel: async () => true,
    maxClusters: 8,
    confidenceThreshold: 0.7,
  });
  expect(persist).not.toHaveBeenCalled();
});
