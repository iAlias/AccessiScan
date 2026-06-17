import {
  prisma, loadScanPageRefs, pendingManualCriteria, persistAiSuggestions,
  setAiReviewStatus, isAiReviewCancelRequested, getPageAxeFindings, clearAiSuggestions,
  getLoginRecipe, resolveSecretsForDomain,
} from "@accessscan/db";
import { getBrowser, executeLogin, mapRecipe, type StorageState } from "@accessscan/scanner";
import { runAiReview } from "./run.js";
import { capturePageContext } from "./capture.js";
import { createProviderFromEnv, type LlmProvider } from "./provider.js";
import type { PageContext, PageRef } from "./types.js";

const MAX_CLUSTERS = 8;
const CONFIDENCE_THRESHOLD = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? "0.7");

export interface RunForScanOverrides {
  provider?: LlmProvider;
  capture?: (rep: PageRef) => Promise<PageContext>;
}

/** If the scan's domain has a login recipe, re-login to capture authed pages as a real user. Best-effort. */
async function resolveStorageState(scanId: string): Promise<StorageState | undefined> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { domainId: true } });
  if (!scan) return undefined;
  const recipe = await getLoginRecipe(scan.domainId);
  if (!recipe) return undefined;
  try {
    const secrets = await resolveSecretsForDomain(scan.domainId);
    const browser = await getBrowser();
    return await executeLogin(browser, mapRecipe(recipe), (ref) => {
      const v = secrets.get(ref);
      if (v === undefined) throw new Error(`No credential for valueRef: ${ref}`);
      return Promise.resolve(v);
    });
  } catch {
    return undefined; // login failed → fall back to anonymous capture
  }
}

/** Production entry point: resolves real provider/capture/db and runs the pass. */
export async function runAiReviewForScan(scanId: string, overrides: RunForScanOverrides = {}): Promise<void> {
  await setAiReviewStatus(scanId, "RUNNING");
  await clearAiSuggestions(scanId); // drop suggestions from any prior run
  try {
    const provider = overrides.provider ?? createProviderFromEnv();
    const storageState = overrides.capture ? undefined : await resolveStorageState(scanId);
    const capture =
      overrides.capture ??
      (async (rep: PageRef) => capturePageContext(await getBrowser(), rep.url, await getPageAxeFindings(rep.id), storageState));

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
