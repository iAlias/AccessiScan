import {
  loadScanPageRefs, pendingManualCriteria, persistAiSuggestions,
  setAiReviewStatus, isAiReviewCancelRequested,
} from "@accessscan/db";
import { getBrowser } from "@accessscan/scanner";
import { runAiReview } from "./run.js";
import { capturePageContext } from "./capture.js";
import { createProviderFromEnv, type LlmProvider } from "./provider.js";
import type { PageContext } from "./types.js";

const MAX_CLUSTERS = 8;
const CONFIDENCE_THRESHOLD = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? "0.7");

export interface RunForScanOverrides {
  provider?: LlmProvider;
  capture?: (url: string, axe: PageContext["axeFindings"]) => Promise<PageContext>;
}

/** Production entry point: resolves real provider/capture/db and runs the pass. */
export async function runAiReviewForScan(scanId: string, overrides: RunForScanOverrides = {}): Promise<void> {
  await setAiReviewStatus(scanId, "RUNNING");
  try {
    const provider = overrides.provider ?? createProviderFromEnv();
    const capture =
      overrides.capture ??
      (async (url: string, axe: PageContext["axeFindings"]) => capturePageContext(await getBrowser(), url, axe));

    await runAiReview(scanId, {
      provider,
      loadPages: loadScanPageRefs,
      pendingCriteria: pendingManualCriteria,
      capture,
      persist: persistAiSuggestions,
      setStatus: () => {},
      shouldCancel: () => isAiReviewCancelRequested(scanId),
      maxClusters: MAX_CLUSTERS,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
    });

    const canceled = await isAiReviewCancelRequested(scanId);
    await setAiReviewStatus(scanId, canceled ? "CANCELED" : "DONE");
  } catch (e) {
    await setAiReviewStatus(scanId, "FAILED", String(e instanceof Error ? e.message : e));
    throw e;
  }
}
