# AI Manual-Criteria Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-demand AI pass that judges WCAG "manual" criteria from a representative page sample (a11y tree + DOM + axe findings) and pre-fills the manual-review wizard with cited, confidence-scored suggestions — without ever unlocking `CONFORME` automatically.

**Architecture:** New `packages/ai-review` package with pure units (criteria catalog, clustering, aggregation, prompts), a pluggable `LlmProvider` (Anthropic + OpenAI-compatible), a Playwright capture step, and an orchestrator. DB gains `ai*` suggestion columns on `CriterionResult` plus an `aiReview*` run record on `Scan`. The web app exposes an owner-gated background trigger and surfaces suggestions in the existing `ReviewWizard`.

**Tech Stack:** TypeScript, pnpm workspaces, Prisma 6 / Postgres, Playwright, Zod, Vitest, Next.js 15. LLM via Anthropic Messages API and OpenAI-compatible chat-completions (`fetch`, no SDK dependency).

**Spec:** `docs/superpowers/specs/2026-06-17-ai-manual-criteria-review-design.md`

---

## File Structure

**New package `packages/ai-review/`:**
- `package.json`, `tsconfig.json` — workspace package config.
- `src/index.ts` — barrel export.
- `src/criteria.ts` — in-scope criteria, scope (page/site) and rubrics.
- `src/types.ts` — shared types + Zod schemas for LLM output and suggestions.
- `src/cluster.ts` — `clusterPages` (pure).
- `src/aggregate.ts` — `aggregateSuggestions` (pure).
- `src/provider.ts` — `LlmProvider` interface + `createProviderFromEnv`.
- `src/provider-anthropic.ts` — Anthropic Messages adapter.
- `src/provider-openai.ts` — OpenAI-compatible adapter.
- `src/prompt.ts` — `buildClusterPrompt`, `buildSitePrompt`, `buildVerifyPrompt`.
- `src/evaluate.ts` — `evaluateCluster`, `evaluateSite`, `verifyFail`.
- `src/capture.ts` — `capturePageContext` (Playwright).
- `src/run.ts` — `runAiReview` orchestrator.

**DB (`packages/db/`):**
- `prisma/schema.prisma` — add `ai*` columns + `AiReviewStatus` enum + `aiReview*` on `Scan`.
- `prisma/migrations/<ts>_ai_review/migration.sql` — manual migration.
- `src/repositories/ai-review.ts` — `persistAiSuggestions`, `getAiSuggestions`, AI-review status helpers.
- `src/index.ts` — export the new repo.

**Web (`apps/web/`):**
- `src/app/api/scans/[id]/ai-review/{route,handlers}.ts` — POST start.
- `src/app/api/scans/[id]/ai-review/status/{route,handlers}.ts` — GET status.
- `src/app/api/scans/[id]/ai-review/cancel/route.ts` — POST cancel.
- `src/components/AiReviewButton.tsx` — trigger + progress (client).
- `src/components/ReviewWizard.tsx` — show AI suggestion + Conferma/Correggi (modify).
- `src/app/scans/[id]/review/page.tsx` — pass `ai*` into the wizard (modify).

---

## Phase 1 — ai-review package scaffold + criteria catalog

### Task 1: Scaffold `packages/ai-review` and the criteria catalog

**Files:**
- Create: `packages/ai-review/package.json`
- Create: `packages/ai-review/tsconfig.json`
- Create: `packages/ai-review/src/criteria.ts`
- Create: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/criteria.test.ts`

- [ ] **Step 1: Create the package manifest**

`packages/ai-review/package.json`:
```json
{
  "name": "@accessscan/ai-review",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {},
  "dependencies": {
    "@accessscan/db": "workspace:*",
    "@accessscan/scanner": "workspace:*",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "playwright": "^1.61.0"
  }
}
```

`packages/ai-review/tsconfig.json` (copy the pattern of `packages/scanner/tsconfig.json` — read it first and mirror `compilerOptions`/`include`):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```
> If `../../tsconfig.base.json` does not exist, read `packages/scanner/tsconfig.json` and reproduce its exact `compilerOptions`.

- [ ] **Step 2: Write the failing test**

`packages/ai-review/tests/criteria.test.ts`:
```ts
import { expect, test } from "vitest";
import { IN_SCOPE_CRITERIA, DEFERRED_VISUAL, criterionScope, criterionRubric } from "../src/criteria.js";

test("deferred visual criteria are excluded from the in-scope set", () => {
  for (const sc of DEFERRED_VISUAL) expect(IN_SCOPE_CRITERIA).not.toContain(sc);
});

test("every in-scope criterion has a scope and a non-empty rubric", () => {
  expect(IN_SCOPE_CRITERIA.length).toBe(25);
  for (const sc of IN_SCOPE_CRITERIA) {
    expect(["page", "site"]).toContain(criterionScope(sc));
    expect(criterionRubric(sc).length).toBeGreaterThan(10);
  }
});

test("site-level criteria are the cross-page ones", () => {
  expect(IN_SCOPE_CRITERIA.filter((sc) => criterionScope(sc) === "site").sort())
    .toEqual(["2.4.5", "3.2.3", "3.2.4"]);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/criteria.test.ts`
Expected: FAIL — cannot resolve `../src/criteria.js`.

- [ ] **Step 4: Implement `criteria.ts`**

`packages/ai-review/src/criteria.ts`:
```ts
// The manual (non-automatable) WCAG 2.1 AA criteria the AI pass evaluates.
// Excludes the purely-visual criteria deferred to a future vision phase.

export type CriterionScope = "page" | "site";

export const DEFERRED_VISUAL = ["1.4.1", "1.4.5", "1.4.11", "2.4.7", "1.3.3"] as const;

interface Rubric {
  scope: CriterionScope;
  rubric: string;
}

const RUBRICS: Record<string, Rubric> = {
  "1.2.1": { scope: "page", rubric: "Audio-only/video-only content has a text alternative (audio) or text/audio alternative (video)." },
  "1.2.2": { scope: "page", rubric: "Every video with speech has synchronized captions (<track kind=captions>)." },
  "1.2.3": { scope: "page", rubric: "Prerecorded video has audio description OR a full text transcript." },
  "1.2.4": { scope: "page", rubric: "Live audio/video has real-time captions." },
  "1.2.5": { scope: "page", rubric: "Prerecorded video has an audio-description track." },
  "1.3.2": { scope: "page", rubric: "DOM reading order matches the logical/visual order; no CSS-reordered content that breaks meaning." },
  "1.3.4": { scope: "page", rubric: "Content is not locked to a single orientation (no forced portrait/landscape)." },
  "1.4.13": { scope: "page", rubric: "Hover/focus content (tooltips/popovers) is dismissible (Esc), hoverable and persistent." },
  "2.1.2": { scope: "page", rubric: "No keyboard trap: focus can enter and leave every interactive component." },
  "2.1.4": { scope: "page", rubric: "Single-character shortcuts are off by default, remappable, or active only on focus." },
  "2.3.1": { scope: "page", rubric: "Nothing flashes more than three times per second." },
  "2.4.3": { scope: "page", rubric: "Focus order is logical and meaningful; no positive tabindex forcing an artificial order." },
  "2.4.5": { scope: "site", rubric: "More than one way to reach a page (menu, search, sitemap, breadcrumb)." },
  "2.4.6": { scope: "page", rubric: "Headings and labels are descriptive of the section/field they introduce." },
  "2.5.1": { scope: "page", rubric: "Multipoint/path-based gestures have a single-pointer alternative." },
  "2.5.2": { scope: "page", rubric: "Pointer actions fire on up-event and can be aborted (no down-event activation without undo)." },
  "2.5.3": { scope: "page", rubric: "The accessible name of a control contains its visible label text." },
  "2.5.4": { scope: "page", rubric: "Motion-actuated functions have a UI alternative and can be disabled." },
  "3.2.1": { scope: "page", rubric: "Focusing an element does not trigger a change of context (popup, submit, navigation)." },
  "3.2.2": { scope: "page", rubric: "Changing an input value does not trigger an unexpected change of context (auto-submit/redirect)." },
  "3.2.3": { scope: "site", rubric: "Repeated navigation blocks appear in the same relative order across pages." },
  "3.2.4": { scope: "site", rubric: "Components with the same function are identified consistently (same name/icon)." },
  "3.3.1": { scope: "page", rubric: "Input errors are identified and described in text to the user." },
  "3.3.3": { scope: "page", rubric: "When known, a correction suggestion is offered for the error." },
  "3.3.4": { scope: "page", rubric: "For legal/financial/data submissions: reversible, checkable, or confirmed before commit." },
  "4.1.3": { scope: "page", rubric: "Dynamic status messages are exposed via role=status/alert/aria-live without moving focus." },
};

export const IN_SCOPE_CRITERIA = Object.keys(RUBRICS).sort();

export function criterionScope(sc: string): CriterionScope {
  return RUBRICS[sc]?.scope ?? "page";
}
export function criterionRubric(sc: string): string {
  return RUBRICS[sc]?.rubric ?? "";
}
export function isInScope(sc: string): boolean {
  return sc in RUBRICS;
}
```

`packages/ai-review/src/index.ts`:
```ts
export * from "./criteria.js";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/criteria.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/ai-review/package.json packages/ai-review/tsconfig.json packages/ai-review/src/criteria.ts packages/ai-review/src/index.ts packages/ai-review/tests/criteria.test.ts
git commit -m "feat(ai-review): scaffold package + manual-criteria catalog"
```

---

## Phase 2 — pure logic (clustering, aggregation, types)

### Task 2: `types.ts` — shared types + Zod schemas

**Files:**
- Create: `packages/ai-review/src/types.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/types.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/types.test.ts`:
```ts
import { expect, test } from "vitest";
import { criterionVerdictSchema, aiVerdictSchema } from "../src/types.js";

test("aiVerdictSchema accepts a well-formed model verdict", () => {
  const ok = aiVerdictSchema.safeParse({
    verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.8, reasoning: "Headings descriptive", evidenceSelector: "h1" }],
  });
  expect(ok.success).toBe(true);
});

test("criterionVerdictSchema rejects an invalid verdict value", () => {
  const bad = criterionVerdictSchema.safeParse({ wcagSc: "2.4.6", verdict: "MAYBE", confidence: 0.5, reasoning: "x" });
  expect(bad.success).toBe(false);
});

test("confidence is clamped range 0..1", () => {
  const bad = criterionVerdictSchema.safeParse({ wcagSc: "2.4.6", verdict: "PASS", confidence: 1.5, reasoning: "x" });
  expect(bad.success).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/types.test.ts`
Expected: FAIL — cannot resolve `../src/types.js`.

- [ ] **Step 3: Implement `types.ts`**

`packages/ai-review/src/types.ts`:
```ts
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
```

Append to `packages/ai-review/src/index.ts`:
```ts
export * from "./types.js";
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/types.ts packages/ai-review/src/index.ts packages/ai-review/tests/types.test.ts
git commit -m "feat(ai-review): shared types + zod schemas for LLM output"
```

### Task 3: `cluster.ts` — group pages by template

**Files:**
- Create: `packages/ai-review/src/cluster.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/cluster.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/cluster.test.ts`:
```ts
import { expect, test } from "vitest";
import { clusterPages } from "../src/cluster.js";
import type { PageRef } from "../src/types.js";

const p = (id: string, url: string, ruleIds: string[]): PageRef => ({ id, url, ruleIds });

test("groups pages with the same url-shape and rule set into one cluster", () => {
  const pages = [
    p("1", "https://a.it/prodotto/123", ["image-alt", "color-contrast"]),
    p("2", "https://a.it/prodotto/456", ["color-contrast", "image-alt"]),
    p("3", "https://a.it/categoria/abc", ["link-name"]),
  ];
  const clusters = clusterPages(pages, 8);
  expect(clusters.length).toBe(2);
  const sizes = clusters.map((c) => c.size).sort();
  expect(sizes).toEqual([1, 2]);
});

test("caps the number of clusters, keeping the largest", () => {
  const pages: PageRef[] = [];
  for (let i = 0; i < 20; i++) pages.push(p(String(i), `https://a.it/t${i}/x`, [`rule${i}`]));
  const clusters = clusterPages(pages, 5);
  expect(clusters.length).toBe(5);
});

test("returns [] for no pages", () => {
  expect(clusterPages([], 8)).toEqual([]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/cluster.test.ts`
Expected: FAIL — cannot resolve `../src/cluster.js`.

- [ ] **Step 3: Implement `cluster.ts`**

`packages/ai-review/src/cluster.ts`:
```ts
import type { PageRef, PageCluster } from "./types.js";

/** Normalize a URL path into a template shape: numeric/slug segments → ":seg". */
function urlShape(url: string): string {
  let path: string;
  try { path = new URL(url).pathname; } catch { path = url; }
  return path
    .split("/")
    .map((seg) => (/^[0-9]+$/.test(seg) || /\d/.test(seg) ? ":seg" : seg))
    .join("/");
}

function clusterKey(p: PageRef): string {
  return `${urlShape(p.url)}|${[...p.ruleIds].sort().join(",")}`;
}

/**
 * Group pages by (url shape, axe rule set). Returns at most `cap` clusters,
 * keeping the largest; each cluster's representative is its first page by id.
 */
export function clusterPages(pages: PageRef[], cap: number): PageCluster[] {
  const groups = new Map<string, PageRef[]>();
  for (const p of pages) {
    const k = clusterKey(p);
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }
  const clusters: PageCluster[] = [...groups.entries()].map(([key, ps]) => ({
    key,
    representative: [...ps].sort((a, b) => a.id.localeCompare(b.id))[0]!,
    size: ps.length,
  }));
  clusters.sort((a, b) => b.size - a.size || a.key.localeCompare(b.key));
  return clusters.slice(0, cap);
}
```

Append to `index.ts`: `export * from "./cluster.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/cluster.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/cluster.ts packages/ai-review/src/index.ts packages/ai-review/tests/cluster.test.ts
git commit -m "feat(ai-review): cluster pages by url-shape + axe rule set"
```

### Task 4: `aggregate.ts` — combine per-cluster verdicts into one suggestion per criterion

**Files:**
- Create: `packages/ai-review/src/aggregate.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/aggregate.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/aggregate.test.ts`:
```ts
import { expect, test } from "vitest";
import { aggregateSuggestions } from "../src/aggregate.js";
import type { CriterionVerdict } from "../src/types.js";

const v = (wcagSc: string, verdict: "PASS" | "FAIL" | "UNSURE", confidence: number, url = "u"): CriterionVerdict & { url: string } =>
  ({ wcagSc, verdict, confidence, reasoning: "r", evidenceSelector: "sel", url });

test("FAIL wins if any cluster fails the criterion", () => {
  const out = aggregateSuggestions([v("2.4.6", "PASS", 0.9), v("2.4.6", "FAIL", 0.8)], 0.7);
  expect(out).toHaveLength(1);
  expect(out[0]!.verdict).toBe("FAIL");
  expect(out[0]!.evidence).toBe("u — sel");
});

test("PASS only if all clusters pass with confidence >= threshold", () => {
  expect(aggregateSuggestions([v("2.4.6", "PASS", 0.9), v("2.4.6", "PASS", 0.95)], 0.7)[0]!.verdict).toBe("PASS");
  // a low-confidence pass downgrades the criterion to UNSURE
  expect(aggregateSuggestions([v("2.4.6", "PASS", 0.5)], 0.7)[0]!.verdict).toBe("UNSURE");
});

test("UNSURE if any cluster is unsure and none fail", () => {
  expect(aggregateSuggestions([v("2.4.6", "PASS", 0.9), v("2.4.6", "UNSURE", 0.4)], 0.7)[0]!.verdict).toBe("UNSURE");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/aggregate.test.ts`
Expected: FAIL — cannot resolve `../src/aggregate.js`.

- [ ] **Step 3: Implement `aggregate.ts`**

`packages/ai-review/src/aggregate.ts`:
```ts
import type { CriterionVerdict, AiSuggestion } from "./types.js";

export type ClusterVerdict = CriterionVerdict & { url: string };

/**
 * Per criterion: FAIL if any cluster fails; PASS only if every cluster passes
 * with confidence >= threshold; otherwise UNSURE. Evidence is taken from the
 * decisive verdict (the failing one, or the lowest-confidence pass).
 */
export function aggregateSuggestions(verdicts: ClusterVerdict[], threshold: number): AiSuggestion[] {
  const byCriterion = new Map<string, ClusterVerdict[]>();
  for (const v of verdicts) {
    const g = byCriterion.get(v.wcagSc);
    if (g) g.push(v);
    else byCriterion.set(v.wcagSc, [v]);
  }
  const out: AiSuggestion[] = [];
  for (const [wcagSc, vs] of byCriterion) {
    const fail = vs.find((v) => v.verdict === "FAIL");
    const evidenceOf = (v: ClusterVerdict): string | null =>
      v.evidenceSelector ? `${v.url} — ${v.evidenceSelector}` : v.url;
    if (fail) {
      out.push({ wcagSc, verdict: "FAIL", confidence: fail.confidence, reasoning: fail.reasoning, evidence: evidenceOf(fail) });
      continue;
    }
    const allConfidentPass = vs.every((v) => v.verdict === "PASS" && v.confidence >= threshold);
    if (allConfidentPass) {
      const weakest = [...vs].sort((a, b) => a.confidence - b.confidence)[0]!;
      out.push({ wcagSc, verdict: "PASS", confidence: weakest.confidence, reasoning: weakest.reasoning, evidence: evidenceOf(weakest) });
      continue;
    }
    const ref = [...vs].sort((a, b) => a.confidence - b.confidence)[0]!;
    out.push({ wcagSc, verdict: "UNSURE", confidence: ref.confidence, reasoning: ref.reasoning, evidence: evidenceOf(ref) });
  }
  return out.sort((a, b) => a.wcagSc.localeCompare(b.wcagSc, undefined, { numeric: true }));
}
```

Append to `index.ts`: `export * from "./aggregate.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/aggregate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/aggregate.ts packages/ai-review/src/index.ts packages/ai-review/tests/aggregate.test.ts
git commit -m "feat(ai-review): aggregate cluster verdicts into per-criterion suggestions"
```

---

## Phase 3 — provider abstraction

### Task 5: `provider.ts` — interface, env factory, and a test fake

**Files:**
- Create: `packages/ai-review/src/provider.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/provider.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/provider.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/provider.test.ts`
Expected: FAIL — cannot resolve `../src/provider.js`.

- [ ] **Step 3: Implement `provider.ts`**

`packages/ai-review/src/provider.ts`:
```ts
import type { ZodSchema } from "zod";

export interface LlmRequest {
  system: string;
  user: string;
  schema: ZodSchema;
}

export interface LlmProvider {
  /** Run the model; return the parsed+validated JSON or throw. */
  evaluate(req: LlmRequest): Promise<unknown>;
}

export class LlmError extends Error {}

/** Deterministic provider for tests — validates the canned value against the schema. */
export function fakeProvider(canned: unknown): LlmProvider {
  return {
    async evaluate(req: LlmRequest) {
      const parsed = req.schema.safeParse(canned);
      if (!parsed.success) throw new LlmError(`fake output failed schema: ${parsed.error.message}`);
      return parsed.data;
    },
  };
}

export interface ProviderConfig {
  provider: "anthropic" | "openai-compatible";
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export function readProviderConfig(env: NodeJS.ProcessEnv): ProviderConfig {
  const provider = (env.AI_PROVIDER ?? "anthropic") as ProviderConfig["provider"];
  return {
    provider,
    model: env.AI_MODEL ?? (provider === "anthropic" ? "claude-sonnet-4-6" : "grok-2"),
    baseUrl: env.AI_BASE_URL,
    apiKey: env.AI_API_KEY,
  };
}
```

Append to `index.ts`: `export * from "./provider.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/provider.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/provider.ts packages/ai-review/src/index.ts packages/ai-review/tests/provider.test.ts
git commit -m "feat(ai-review): LlmProvider interface + env config + test fake"
```

### Task 6: Provider adapters (Anthropic + OpenAI-compatible) with retry

**Files:**
- Create: `packages/ai-review/src/provider-anthropic.ts`
- Create: `packages/ai-review/src/provider-openai.ts`
- Modify: `packages/ai-review/src/provider.ts` (add `createProviderFromEnv` + `withRetry`)
- Test: `packages/ai-review/tests/provider-http.test.ts`

- [ ] **Step 1: Write the failing test** (inject `fetch`, assert request shape, parse, and retry-on-malformed)

`packages/ai-review/tests/provider-http.test.ts`:
```ts
import { expect, test, vi } from "vitest";
import { openAiCompatibleProvider } from "../src/provider-openai.js";
import { aiVerdictSchema } from "../src/types.js";

function jsonResponse(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });
}

test("openai-compatible provider parses JSON content and validates it", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(JSON.stringify({ verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.9, reasoning: "ok" }] })));
  const provider = openAiCompatibleProvider({ model: "m", baseUrl: "https://x/v1", apiKey: "k" }, fetchMock as unknown as typeof fetch);
  const out = await provider.evaluate({ system: "s", user: "u", schema: aiVerdictSchema });
  expect((out as { verdicts: unknown[] }).verdicts).toHaveLength(1);
  const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
  expect(body.model).toBe("m");
  expect(body.messages[0].role).toBe("system");
});

test("retries once on malformed JSON then throws", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(jsonResponse("not json"))
    .mockResolvedValueOnce(jsonResponse("still not json"));
  const provider = openAiCompatibleProvider({ model: "m", baseUrl: "https://x/v1", apiKey: "k", maxRetries: 1 }, fetchMock as unknown as typeof fetch);
  await expect(provider.evaluate({ system: "s", user: "u", schema: aiVerdictSchema })).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/provider-http.test.ts`
Expected: FAIL — cannot resolve `../src/provider-openai.js`.

- [ ] **Step 3: Implement the OpenAI-compatible adapter**

`packages/ai-review/src/provider-openai.ts`:
```ts
import type { ZodSchema } from "zod";
import { LlmError, type LlmProvider, type LlmRequest } from "./provider.js";

export interface OpenAiOpts {
  model: string;
  baseUrl?: string; // default OpenAI; for Grok/Groq/Ollama set this
  apiKey?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  return JSON.parse(raw.trim());
}

export function openAiCompatibleProvider(opts: OpenAiOpts, fetchImpl: typeof fetch = fetch): LlmProvider {
  const base = opts.baseUrl ?? "https://api.openai.com/v1";
  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  return {
    async evaluate(req: LlmRequest) {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetchImpl(`${base}/chat/completions`, {
            method: "POST",
            signal: ctrl.signal,
            headers: { "content-type": "application/json", ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}) },
            body: JSON.stringify({
              model: opts.model,
              messages: [{ role: "system", content: req.system }, { role: "user", content: req.user }],
              response_format: { type: "json_object" },
              temperature: 0,
            }),
          });
          if (!res.ok) throw new LlmError(`provider HTTP ${res.status}`);
          const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const content = data.choices?.[0]?.message?.content ?? "";
          return validate(req.schema, extractJson(content));
        } catch (e) {
          lastErr = e;
        } finally {
          clearTimeout(timer);
        }
      }
      throw new LlmError(`provider failed after ${maxRetries + 1} attempts: ${String(lastErr)}`);
    },
  };
}

function validate(schema: ZodSchema, value: unknown): unknown {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new LlmError(`schema validation failed: ${parsed.error.message}`);
  return parsed.data;
}
```

- [ ] **Step 4: Implement the Anthropic adapter**

`packages/ai-review/src/provider-anthropic.ts`:
```ts
import type { ZodSchema } from "zod";
import { LlmError, type LlmProvider, type LlmRequest } from "./provider.js";

export interface AnthropicOpts {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fenced ? fenced[1]! : text).trim());
}

export function anthropicProvider(opts: AnthropicOpts, fetchImpl: typeof fetch = fetch): LlmProvider {
  const base = opts.baseUrl ?? "https://api.anthropic.com";
  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  return {
    async evaluate(req: LlmRequest) {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetchImpl(`${base}/v1/messages`, {
            method: "POST",
            signal: ctrl.signal,
            headers: {
              "content-type": "application/json",
              "anthropic-version": "2023-06-01",
              ...(opts.apiKey ? { "x-api-key": opts.apiKey } : {}),
            },
            body: JSON.stringify({
              model: opts.model,
              max_tokens: 4096,
              temperature: 0,
              system: `${req.system}\nReply with ONLY a JSON object, no prose.`,
              messages: [{ role: "user", content: req.user }],
            }),
          });
          if (!res.ok) throw new LlmError(`anthropic HTTP ${res.status}`);
          const data = (await res.json()) as { content?: Array<{ text?: string }> };
          const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
          const parsed = (req.schema as ZodSchema).safeParse(extractJson(text));
          if (!parsed.success) throw new LlmError(`schema validation failed: ${parsed.error.message}`);
          return parsed.data;
        } catch (e) {
          lastErr = e;
        } finally {
          clearTimeout(timer);
        }
      }
      throw new LlmError(`anthropic failed after ${maxRetries + 1} attempts: ${String(lastErr)}`);
    },
  };
}
```

- [ ] **Step 5: Add `createProviderFromEnv` to `provider.ts`**

Append to `packages/ai-review/src/provider.ts`:
```ts
import { anthropicProvider } from "./provider-anthropic.js";
import { openAiCompatibleProvider } from "./provider-openai.js";

export function createProviderFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const cfg = readProviderConfig(env);
  if (cfg.provider === "anthropic") return anthropicProvider({ model: cfg.model, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
  return openAiCompatibleProvider({ model: cfg.model, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
}
```
Append to `index.ts`: `export * from "./provider-openai.js";` and `export * from "./provider-anthropic.js";`

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/provider-http.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/ai-review/src/provider-openai.ts packages/ai-review/src/provider-anthropic.ts packages/ai-review/src/provider.ts packages/ai-review/src/index.ts packages/ai-review/tests/provider-http.test.ts
git commit -m "feat(ai-review): Anthropic + OpenAI-compatible adapters with retry"
```

---

## Phase 4 — prompts + evaluation

### Task 7: `prompt.ts` — build cluster/site/verify prompts

**Files:**
- Create: `packages/ai-review/src/prompt.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/prompt.test.ts`:
```ts
import { expect, test } from "vitest";
import { buildClusterPrompt, buildVerifyPrompt } from "../src/prompt.js";
import type { PageContext } from "../src/types.js";

const ctx: PageContext = { url: "https://a.it/p", a11yTree: "TREE", domExcerpt: "<main>...</main>", axeFindings: [{ ruleId: "image-alt", impact: "critical", help: "alt", targetSelector: "img" }] };

test("cluster prompt includes the page url, a11y tree, axe findings and only page-level criteria", () => {
  const { user, system } = buildClusterPrompt(ctx, ["2.4.6", "3.2.1"]);
  expect(user).toContain("https://a.it/p");
  expect(user).toContain("TREE");
  expect(user).toContain("image-alt");
  expect(user).toContain("2.4.6");
  expect(system).toContain("JSON");
});

test("verify prompt frames the reviewer as a skeptic for a single FAIL", () => {
  const v = buildVerifyPrompt(ctx, { wcagSc: "2.4.6", verdict: "FAIL", confidence: 0.8, reasoning: "headings not descriptive" });
  expect(v.user).toContain("2.4.6");
  expect(v.user.toLowerCase()).toContain("refute");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/prompt.test.ts`
Expected: FAIL — cannot resolve `../src/prompt.js`.

- [ ] **Step 3: Implement `prompt.ts`**

`packages/ai-review/src/prompt.ts`:
```ts
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
```

Append to `index.ts`: `export * from "./prompt.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/prompt.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/prompt.ts packages/ai-review/src/index.ts packages/ai-review/tests/prompt.test.ts
git commit -m "feat(ai-review): cluster/site/verify prompt builders"
```

### Task 8: `evaluate.ts` — run provider, adversarially verify FAILs

**Files:**
- Create: `packages/ai-review/src/evaluate.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/evaluate.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/evaluate.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/evaluate.test.ts`
Expected: FAIL — cannot resolve `../src/evaluate.js`.

- [ ] **Step 3: Implement `evaluate.ts`**

`packages/ai-review/src/evaluate.ts`:
```ts
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
```

Append to `index.ts`: `export * from "./evaluate.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/evaluate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/evaluate.ts packages/ai-review/src/index.ts packages/ai-review/tests/evaluate.test.ts
git commit -m "feat(ai-review): evaluate clusters + adversarial verify of FAILs"
```

---

## Phase 5 — capture + orchestrator

### Task 9: `capture.ts` — Playwright page context

**Files:**
- Create: `packages/ai-review/src/capture.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/capture.browser.test.ts`

> Note: `*.browser.test.ts` runs under `vitest.browser.config.ts` and may use a real browser. Follow the pattern of `packages/scanner/tests/scanner.browser.test.ts` (serve HTML from a local http server, then capture).

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/capture.browser.test.ts`:
```ts
import { afterAll, expect, test } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getBrowser, closeBrowser } from "@accessscan/scanner";
import { capturePageContext } from "../src/capture.js";

afterAll(() => closeBrowser());

test("capturePageContext returns a11y tree text + DOM excerpt for a live page", async () => {
  const html = `<!doctype html><html lang="it"><head><title>T</title></head><body><main><h1>Ciao</h1><button>Vai</button></main></body></html>`;
  const server = createServer((_q, r) => { r.writeHead(200, { "content-type": "text/html" }); r.end(html); });
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
  const { port } = server.address() as AddressInfo;
  try {
    const browser = await getBrowser();
    const ctx = await capturePageContext(browser, `http://127.0.0.1:${port}/`, []);
    expect(ctx.a11yTree).toContain("Vai");
    expect(ctx.domExcerpt).toContain("Ciao");
  } finally {
    await new Promise<void>((res) => server.close(() => res()));
  }
}, 60_000);
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run -c vitest.browser.config.ts packages/ai-review/tests/capture.browser.test.ts`
Expected: FAIL — cannot resolve `../src/capture.js`.

- [ ] **Step 3: Implement `capture.ts`**

`packages/ai-review/src/capture.ts`:
```ts
import type { Browser } from "playwright";
import type { PageContext, StorageStateLike } from "./types.js";

export interface AxeFinding { ruleId: string; impact: string | null; help: string | null; targetSelector: string }

const MAX_DOM = 20_000;

function flattenA11y(node: unknown, depth = 0): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { role?: string; name?: string; children?: unknown[] };
  const line = `${"  ".repeat(depth)}${n.role ?? "?"}${n.name ? `: ${n.name}` : ""}`;
  const kids = (n.children ?? []).map((c) => flattenA11y(c, depth + 1)).filter(Boolean);
  return [line, ...kids].join("\n");
}

/** Re-render a page and capture its accessibility tree + a trimmed DOM excerpt. */
export async function capturePageContext(
  browser: Browser,
  url: string,
  axeFindings: AxeFinding[],
  storageState?: StorageStateLike,
): Promise<PageContext> {
  const context = await browser.newContext(storageState ? { storageState } : {});
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const snapshot = await page.accessibility.snapshot();
    const a11yTree = snapshot ? flattenA11y(snapshot) : "(empty)";
    const main = await page.$("main");
    const domExcerpt = ((await (main ?? page).innerHTML().catch(() => "")) || "").slice(0, MAX_DOM);
    return { url, a11yTree, domExcerpt, axeFindings };
  } finally {
    await context.close();
  }
}
```

Add to `types.ts` (so capture can accept a storage state without importing scanner types directly):
```ts
export type StorageStateLike = Parameters<import("playwright").Browser["newContext"]>[0] extends infer O
  ? O extends { storageState?: infer S } ? S : never
  : never;
```
> If that conditional type proves awkward, simplify to `export type StorageStateLike = unknown;` and cast at the call site.

Append to `index.ts`: `export * from "./capture.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run -c vitest.browser.config.ts packages/ai-review/tests/capture.browser.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/capture.ts packages/ai-review/src/types.ts packages/ai-review/src/index.ts packages/ai-review/tests/capture.browser.test.ts
git commit -m "feat(ai-review): capture a11y tree + DOM excerpt via Playwright"
```

### Task 10: `run.ts` — orchestrator (deps injected)

**Files:**
- Create: `packages/ai-review/src/run.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/run.test.ts`

The orchestrator takes injected `deps` (provider, capture, loadPages, persist, shouldCancel) so it is testable without a browser/LLM/db.

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/run.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/run.test.ts`
Expected: FAIL — cannot resolve `../src/run.js`.

- [ ] **Step 3: Implement `run.ts`**

`packages/ai-review/src/run.ts`:
```ts
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
```

Append to `index.ts`: `export * from "./run.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/run.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/run.ts packages/ai-review/src/index.ts packages/ai-review/tests/run.test.ts
git commit -m "feat(ai-review): runAiReview orchestrator with injected deps"
```

---

## Phase 6 — DB schema + persistence

### Task 11: Schema migration + `ai-review` repository

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260617120000_ai_review/migration.sql`
- Create: `packages/db/src/repositories/ai-review.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/tests/ai-review.repo.test.ts`

- [ ] **Step 1: Edit the Prisma schema**

In `packages/db/prisma/schema.prisma`, add to `model CriterionResult` (after `reviewNote String?`):
```prisma
  aiState       CriterionState?
  aiReasoning   String?
  aiConfidence  Float?
  aiEvidence    String?
  aiReviewedAt  DateTime?
```
Add to `model Scan` (after `cancelRequested Boolean @default(false)`):
```prisma
  aiReviewStatus          AiReviewStatus @default(IDLE)
  aiReviewError           String?
  aiReviewCancelRequested Boolean        @default(false)
```
Add the enum near the other enums:
```prisma
enum AiReviewStatus {
  IDLE
  RUNNING
  DONE
  FAILED
  CANCELED
}
```

- [ ] **Step 2: Write the migration SQL**

`packages/db/prisma/migrations/20260617120000_ai_review/migration.sql`:
```sql
CREATE TYPE "AiReviewStatus" AS ENUM ('IDLE', 'RUNNING', 'DONE', 'FAILED', 'CANCELED');

ALTER TABLE "CriterionResult"
  ADD COLUMN "aiState" "CriterionState",
  ADD COLUMN "aiReasoning" TEXT,
  ADD COLUMN "aiConfidence" DOUBLE PRECISION,
  ADD COLUMN "aiEvidence" TEXT,
  ADD COLUMN "aiReviewedAt" TIMESTAMP(3);

ALTER TABLE "Scan"
  ADD COLUMN "aiReviewStatus" "AiReviewStatus" NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "aiReviewError" TEXT,
  ADD COLUMN "aiReviewCancelRequested" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 3: Apply migration + regenerate client** (dev server must be stopped first)

```bash
DATABASE_URL="postgresql://accessscan:accessscan@localhost:5432/accessscan?schema=public" pnpm --filter @accessscan/db prisma migrate deploy
DATABASE_URL="postgresql://accessscan:accessscan@localhost:5432/accessscan_test?schema=public" pnpm --filter @accessscan/db prisma migrate deploy
DATABASE_URL="postgresql://accessscan:accessscan@localhost:5432/accessscan?schema=public" pnpm --filter @accessscan/db prisma generate
```
Expected: "All migrations have been successfully applied." twice, then "Generated Prisma Client".

- [ ] **Step 4: Write the failing test**

`packages/db/tests/ai-review.repo.test.ts`:
```ts
import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "../src/index.js";
import { persistAiSuggestions, getAiSuggestions, setAiReviewStatus, isAiReviewCancelRequested, loadScanPageRefs, pendingManualCriteria } from "../src/repositories/ai-review.js";
import { resetDb } from "./helpers/reset-db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function scan() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return (await createScan(d.id)).id;
}

test("persistAiSuggestions writes ai* and never touches state/source", async () => {
  const scanId = await scan();
  await prisma.criterionResult.create({ data: { scanId, wcagSc: "2.4.6", state: "NEEDS_MANUAL_REVIEW", source: "AUTOMATED" } });
  await persistAiSuggestions(scanId, [{ wcagSc: "2.4.6", verdict: "FAIL", confidence: 0.8, reasoning: "bad", evidence: "u — sel" }]);
  const row = await prisma.criterionResult.findFirstOrThrow({ where: { scanId, wcagSc: "2.4.6" } });
  expect(row.aiState).toBe("FAIL");
  expect(row.aiReasoning).toBe("bad");
  expect(row.state).toBe("NEEDS_MANUAL_REVIEW"); // unchanged
  expect(row.source).toBe("AUTOMATED");           // unchanged
});

test("pendingManualCriteria returns only NEEDS_MANUAL_REVIEW criteria", async () => {
  const scanId = await scan();
  await prisma.criterionResult.createMany({ data: [
    { scanId, wcagSc: "2.4.6", state: "NEEDS_MANUAL_REVIEW" },
    { scanId, wcagSc: "1.4.3", state: "FAIL" },
  ] });
  expect(await pendingManualCriteria(scanId)).toEqual(["2.4.6"]);
});

test("ai review status + cancel flag round-trip", async () => {
  const scanId = await scan();
  await setAiReviewStatus(scanId, "RUNNING");
  expect((await prisma.scan.findUniqueOrThrow({ where: { id: scanId } })).aiReviewStatus).toBe("RUNNING");
  await prisma.scan.update({ where: { id: scanId }, data: { aiReviewCancelRequested: true } });
  expect(await isAiReviewCancelRequested(scanId)).toBe(true);
});
```

- [ ] **Step 5: Implement the repository**

`packages/db/src/repositories/ai-review.ts`:
```ts
import { prisma } from "../client.js";
import type { AiReviewStatus } from "@prisma/client";

export interface AiSuggestionInput {
  wcagSc: string;
  verdict: "PASS" | "FAIL" | "UNSURE";
  confidence: number;
  reasoning: string;
  evidence: string | null;
}

const VERDICT_TO_STATE = { PASS: "PASS", FAIL: "FAIL", UNSURE: "NEEDS_MANUAL_REVIEW" } as const;

/** Write AI suggestions onto existing CriterionResult rows. Never touches state/source. */
export async function persistAiSuggestions(scanId: string, suggestions: AiSuggestionInput[]): Promise<void> {
  const now = new Date();
  await prisma.$transaction(
    suggestions.map((s) =>
      prisma.criterionResult.updateMany({
        where: { scanId, wcagSc: s.wcagSc },
        data: {
          aiState: VERDICT_TO_STATE[s.verdict],
          aiReasoning: s.reasoning,
          aiConfidence: s.confidence,
          aiEvidence: s.evidence,
          aiReviewedAt: now,
        },
      }),
    ),
  );
}

export function getAiSuggestions(scanId: string) {
  return prisma.criterionResult.findMany({
    where: { scanId, aiState: { not: null } },
    select: { wcagSc: true, aiState: true, aiReasoning: true, aiConfidence: true, aiEvidence: true },
  });
}

export async function pendingManualCriteria(scanId: string): Promise<string[]> {
  const rows = await prisma.criterionResult.findMany({ where: { scanId, state: "NEEDS_MANUAL_REVIEW" }, select: { wcagSc: true }, orderBy: { wcagSc: "asc" } });
  return rows.map((r) => r.wcagSc);
}

export async function loadScanPageRefs(scanId: string): Promise<Array<{ id: string; url: string; ruleIds: string[] }>> {
  const pages = await prisma.page.findMany({
    where: { scanId },
    select: { id: true, url: true, issues: { select: { ruleId: true } } },
  });
  return pages.map((p) => ({ id: p.id, url: p.url, ruleIds: [...new Set(p.issues.map((i) => i.ruleId))] }));
}

export function setAiReviewStatus(scanId: string, status: AiReviewStatus, error?: string | null): Promise<unknown> {
  return prisma.scan.update({ where: { id: scanId }, data: { aiReviewStatus: status, aiReviewError: error ?? null } });
}

export async function isAiReviewCancelRequested(scanId: string): Promise<boolean> {
  const s = await prisma.scan.findUnique({ where: { id: scanId }, select: { aiReviewCancelRequested: true } });
  return s?.aiReviewCancelRequested ?? false;
}

export function requestAiReviewCancel(scanId: string): Promise<unknown> {
  return prisma.scan.update({ where: { id: scanId }, data: { aiReviewCancelRequested: true } });
}
```

Add to `packages/db/src/index.ts`: `export * from "./repositories/ai-review.js";`

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run packages/db/tests/ai-review.repo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260617120000_ai_review packages/db/src/repositories/ai-review.ts packages/db/src/index.ts packages/db/tests/ai-review.repo.test.ts
git commit -m "feat(db): AI-review suggestion columns + status + repository"
```

---

## Phase 7 — orchestrator wiring (`runAiReviewForScan`)

### Task 12: Wire the orchestrator to real db + provider + capture

**Files:**
- Create: `packages/ai-review/src/run-for-scan.ts`
- Modify: `packages/ai-review/src/index.ts`
- Test: `packages/ai-review/tests/run-for-scan.test.ts` (stub provider + in-memory db via the real repo against test DB)

- [ ] **Step 1: Write the failing test**

`packages/ai-review/tests/run-for-scan.test.ts`:
```ts
import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain } from "@accessscan/db";
import { createScan, persistPageWithIssues } from "@accessscan/db";
import { resetDb } from "../../db/tests/helpers/reset-db.js";
import { runAiReviewForScan } from "../src/run-for-scan.js";
import { fakeProvider } from "../src/provider.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

test("runAiReviewForScan persists an AI suggestion for a pending criterion", async () => {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  const s = await createScan(d.id);
  await persistPageWithIssues(s.id, { url: "https://a.it/p", httpStatus: 200, depth: 0, discoveredVia: "BFS" }, []);
  await prisma.criterionResult.create({ data: { scanId: s.id, wcagSc: "2.4.6", state: "NEEDS_MANUAL_REVIEW" } });

  await runAiReviewForScan(s.id, {
    provider: fakeProvider({ verdicts: [{ wcagSc: "2.4.6", verdict: "PASS", confidence: 0.9, reasoning: "ok" }] }),
    capture: async (url) => ({ url, a11yTree: "T", domExcerpt: "D", axeFindings: [] }),
  });

  const row = await prisma.criterionResult.findFirstOrThrow({ where: { scanId: s.id, wcagSc: "2.4.6" } });
  expect(row.aiState).toBe("PASS");
  expect((await prisma.scan.findUniqueOrThrow({ where: { id: s.id } })).aiReviewStatus).toBe("DONE");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/ai-review/tests/run-for-scan.test.ts`
Expected: FAIL — cannot resolve `../src/run-for-scan.js`.

- [ ] **Step 3: Implement `run-for-scan.ts`**

`packages/ai-review/src/run-for-scan.ts`:
```ts
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
```

Append to `index.ts`: `export * from "./run-for-scan.js";`

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/ai-review/tests/run-for-scan.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add packages/ai-review/src/run-for-scan.ts packages/ai-review/src/index.ts packages/ai-review/tests/run-for-scan.test.ts
git commit -m "feat(ai-review): production runAiReviewForScan (real db + provider + capture)"
```

---

## Phase 8 — web API

### Task 13: AI-review API routes (start / status / cancel)

**Files:**
- Create: `apps/web/src/app/api/scans/[id]/ai-review/handlers.ts`
- Create: `apps/web/src/app/api/scans/[id]/ai-review/route.ts`
- Create: `apps/web/src/app/api/scans/[id]/ai-review/status/handlers.ts`
- Create: `apps/web/src/app/api/scans/[id]/ai-review/status/route.ts`
- Create: `apps/web/src/app/api/scans/[id]/ai-review/cancel/route.ts`
- Add: `@accessscan/ai-review` to `apps/web/package.json` dependencies
- Test: `apps/web/tests/ai-review.api.test.ts`

- [ ] **Step 1: Add the dependency**

In `apps/web/package.json` add to `dependencies`: `"@accessscan/ai-review": "workspace:*",` then run `pnpm install`.

- [ ] **Step 2: Write the failing test** (handler-level, like other api tests)

`apps/web/tests/ai-review.api.test.ts`:
```ts
import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma, createProject, createDomain, createScan } from "@accessscan/db";
import { resetDb } from "../../../packages/db/tests/helpers/reset-db.js";
import { handleStartAiReview, handleAiReviewStatus } from "../src/app/api/scans/[id]/ai-review/handlers.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function scanId() {
  const u = await prisma.user.create({ data: { email: "o@x.it", name: "O", passwordHash: "x", role: "ADMIN" } });
  const p = await createProject({ name: "P", ownerId: u.id });
  const d = await createDomain({ projectId: p.id, baseUrl: "https://a.it" });
  return (await createScan(d.id)).id;
}

test("start returns 202 and flips status to RUNNING; a no-op runner is injected", async () => {
  const id = await scanId();
  const res = await handleStartAiReview(id, async () => {}); // injected runner
  expect(res.status).toBe(202);
});

test("status returns the current ai review status + suggestions", async () => {
  const id = await scanId();
  const res = await handleAiReviewStatus(id);
  expect(res.status).toBe(200);
  expect((res.body as { status: string }).status).toBe("IDLE");
});

test("start is 409 when already running", async () => {
  const id = await scanId();
  await prisma.scan.update({ where: { id }, data: { aiReviewStatus: "RUNNING" } });
  const res = await handleStartAiReview(id, async () => {});
  expect(res.status).toBe(409);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run apps/web/tests/ai-review.api.test.ts`
Expected: FAIL — cannot resolve the handlers module.

- [ ] **Step 4: Implement the handlers**

`apps/web/src/app/api/scans/[id]/ai-review/handlers.ts`:
```ts
import { prisma, setAiReviewStatus, getAiSuggestions } from "@accessscan/db";
import type { HandlerResult } from "../../../projects/handlers.js";

export type AiRunner = (scanId: string) => Promise<void>;

export async function handleStartAiReview(scanId: string, runner: AiRunner): Promise<HandlerResult<unknown>> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { aiReviewStatus: true } });
  if (!scan) return { status: 404, body: { error: "scan not found" } };
  if (scan.aiReviewStatus === "RUNNING") return { status: 409, body: { error: "ai review already running" } };
  await prisma.scan.update({ where: { id: scanId }, data: { aiReviewStatus: "RUNNING", aiReviewCancelRequested: false, aiReviewError: null } });
  void runner(scanId).catch(async (e) => { await setAiReviewStatus(scanId, "FAILED", String(e)).catch(() => {}); });
  return { status: 202, body: { ok: true } };
}

export async function handleAiReviewStatus(scanId: string): Promise<HandlerResult<unknown>> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { aiReviewStatus: true, aiReviewError: true } });
  if (!scan) return { status: 404, body: { error: "scan not found" } };
  const suggestions = await getAiSuggestions(scanId);
  return { status: 200, body: { status: scan.aiReviewStatus, error: scan.aiReviewError, suggestions } };
}
```

- [ ] **Step 5: Implement the routes** (owner-gated + ADMIN, mirroring the review routes)

`apps/web/src/app/api/scans/[id]/ai-review/route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/require-session.js";
import { assertScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { runAiReviewForScan } from "@accessscan/ai-review";
import { handleStartAiReview } from "./handlers.js";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole();
    const { id } = await params;
    await assertScanOwner(id, session);
    const res = await handleStartAiReview(id, (scanId) => runAiReviewForScan(scanId));
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e, { adminGate: true });
  }
}
```

`apps/web/src/app/api/scans/[id]/ai-review/status/handlers.ts`:
```ts
export { handleAiReviewStatus } from "../handlers.js";
```
`apps/web/src/app/api/scans/[id]/ai-review/status/route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { handleAiReviewStatus } from "./handlers.js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireScanOwner(id);
    const res = await handleAiReviewStatus(id);
    return NextResponse.json(res.body, { status: res.status });
  } catch (e) {
    return apiError(e);
  }
}
```
`apps/web/src/app/api/scans/[id]/ai-review/cancel/route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/require-session.js";
import { assertScanOwner } from "@/lib/authz.js";
import { apiError } from "@/lib/api-error.js";
import { requestAiReviewCancel } from "@accessscan/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole();
    const { id } = await params;
    await assertScanOwner(id, session);
    await requestAiReviewCancel(id);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return apiError(e, { adminGate: true });
  }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm vitest run apps/web/tests/ai-review.api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/src/app/api/scans/[id]/ai-review apps/web/tests/ai-review.api.test.ts
git commit -m "feat(web): owner-gated AI-review start/status/cancel API"
```

---

## Phase 9 — UI

### Task 14: `AiReviewButton` + report integration

**Files:**
- Create: `apps/web/src/components/AiReviewButton.tsx`
- Modify: `apps/web/src/app/scans/[id]/page.tsx` (render the button for ADMIN, after the existing "Avvia revisione manuale" link)
- Test: `apps/web/tests/ai-review-button.browser.test.ts`

- [ ] **Step 1: Write the failing test** (axe-zero-violations on the component)

`apps/web/tests/ai-review-button.browser.test.ts`:
```ts
import { afterAll, expect, it } from "vitest";
import { createElement as h } from "react";
import { closeBrowser } from "@accessscan/scanner";
import { axeScanElement } from "./helpers/render-axe.js";
import { AiReviewButton } from "../src/components/AiReviewButton.js";

afterAll(async () => { await closeBrowser(); });

it("AiReviewButton has zero axe violations", async () => {
  expect(await axeScanElement("AI", h(AiReviewButton, { scanId: "s1" }))).toEqual([]);
}, 60_000);
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run -c vitest.browser.config.ts apps/web/tests/ai-review-button.browser.test.ts`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement `AiReviewButton.tsx`** (poll pattern mirrors `ScanButton.tsx`)

`apps/web/src/components/AiReviewButton.tsx`:
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "IDLE" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";
const POLL_MS = 2000;

export function AiReviewButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("IDLE");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function stop() { if (timer.current) { clearInterval(timer.current); timer.current = null; } }

  async function poll() {
    try {
      const r = await fetch(`/api/scans/${scanId}/ai-review/status`);
      if (r.status === 401 || r.status === 403 || r.status === 404) { stop(); return; }
      if (!r.ok) return;
      const { status: s } = (await r.json()) as { status: Status };
      setStatus(s);
      if (s === "DONE" || s === "FAILED" || s === "CANCELED") { stop(); router.refresh(); }
    } catch { /* transient */ }
  }

  async function start() {
    try {
      const r = await fetch(`/api/scans/${scanId}/ai-review`, { method: "POST" });
      if (!r.ok) return;
      setStatus("RUNNING");
      void poll();
      timer.current = setInterval(() => void poll(), POLL_MS);
    } catch { /* ignore */ }
  }

  const running = status === "RUNNING";
  return (
    <p>
      <button className="btn btn--ghost" type="button" onClick={() => void start()} disabled={running}>
        {running ? "Valutazione AI in corso…" : "Pre-valuta con AI"}
      </button>
      <span role="status" aria-live="polite" className="domain-card__meta">
        {status === "DONE" ? " Suggerimenti AI pronti." : status === "FAILED" ? " Valutazione AI fallita (configura il provider)." : status === "CANCELED" ? " Valutazione AI annullata." : ""}
      </span>
    </p>
  );
}
```

In `apps/web/src/app/scans/[id]/page.tsx`, import it and render under the admin review link:
```tsx
import { AiReviewButton } from "@/components/AiReviewButton.js";
// ...
{session.user?.role === "ADMIN" && (
  <p><a className="btn" href={`/scans/${core.id}/review`}>Avvia revisione manuale</a></p>
)}
{session.user?.role === "ADMIN" && <AiReviewButton scanId={core.id} />}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run -c vitest.browser.config.ts apps/web/tests/ai-review-button.browser.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/AiReviewButton.tsx "apps/web/src/app/scans/[id]/page.tsx" apps/web/tests/ai-review-button.browser.test.ts
git commit -m "feat(web): Pre-valuta con AI button on the report"
```

### Task 15: Surface AI suggestions in the review wizard

**Files:**
- Modify: `apps/web/src/components/ReviewWizard.tsx`
- Modify: `apps/web/src/app/scans/[id]/review/page.tsx` (pass `ai*` into the wizard)
- Modify: `apps/web/src/app/api/scans/[id]/review/handlers.ts` (include AI suggestion in `getReviewState`-derived criteria — OR read from `getAiSuggestions`)
- Test: `apps/web/tests/review-wizard.browser.test.ts` (extend existing — render a criterion carrying an AI suggestion, assert zero axe violations)

- [ ] **Step 1: Extend the wizard criterion type and render the suggestion**

In `ReviewWizard.tsx`, extend `WizardCriterion`:
```tsx
export interface WizardCriterion {
  wcagSc: string; state: CriterionState; source: string; reviewNote: string | null;
  aiState?: CriterionState | null; aiReasoning?: string | null; aiConfidence?: number | null; aiEvidence?: string | null;
}
```
In the pending-criterion `<li>` (where Pass/Fail buttons render), add, before the buttons:
```tsx
{c.aiState && (
  <span className="ai-suggestion">
    <strong>AI:</strong> {criterionStateLabel(c.aiState)}
    {typeof c.aiConfidence === "number" ? ` (${Math.round(c.aiConfidence * 100)}%)` : ""}
    {c.aiReasoning ? ` — ${c.aiReasoning}` : ""}
    {c.aiEvidence ? <> · <code>{c.aiEvidence}</code></> : null}
  </span>
)}
```
Add a "Conferma AI" button that confirms the AI verdict (only when `aiState` is PASS/FAIL):
```tsx
{c.aiState === "PASS" || c.aiState === "FAIL" ? (
  <button className="btn btn--ghost" onClick={() => void decide(sc, c.aiState as "PASS" | "FAIL")}>Conferma AI</button>
) : null}
```
> `decide(sc, "PASS"|"FAIL")` already posts to the review endpoint and sets `source=MANUAL`. Confirming the AI suggestion reuses it — the human is signing off, satisfying the invariant.

- [ ] **Step 2: Pass `ai*` through the review page**

In `apps/web/src/app/scans/[id]/review/page.tsx`, after `getReviewState`, also load AI suggestions and merge:
```tsx
import { getReviewState, scanOwnerId, getAiSuggestions } from "@accessscan/db";
// ...
const ai = await getAiSuggestions(id);
const aiByCriterion = new Map(ai.map((a) => [a.wcagSc, a]));
const criteria: WizardCriterion[] = state.criteria.map((c) => {
  const a = aiByCriterion.get(c.wcagSc);
  return {
    wcagSc: c.wcagSc, state: c.state as CriterionState, source: c.source, reviewNote: c.reviewNote,
    aiState: a?.aiState as CriterionState | undefined, aiReasoning: a?.aiReasoning, aiConfidence: a?.aiConfidence, aiEvidence: a?.aiEvidence,
  };
});
```

- [ ] **Step 3: Write/extend the failing browser test**

Add to `apps/web/tests/review-wizard.browser.test.ts` a case rendering a `ReviewWizard` whose `initialCriteria` includes an `aiState`/`aiReasoning`, asserting `axeScanElement(...)` returns `[]`. (Follow the existing test's structure in that file.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run -c vitest.browser.config.ts apps/web/tests/review-wizard.browser.test.ts`
Expected: PASS.

- [ ] **Step 5: Add CSS for `.ai-suggestion`**

In `apps/web/src/app/dashboard.css` add:
```css
.ai-suggestion { display: block; margin: 4px 0; font-size: 12.5px; color: var(--text-muted); }
.ai-suggestion code { background: var(--surface-2); padding: 1px 5px; border-radius: 5px; }
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ReviewWizard.tsx "apps/web/src/app/scans/[id]/review/page.tsx" apps/web/src/app/dashboard.css apps/web/tests/review-wizard.browser.test.ts
git commit -m "feat(web): show AI suggestions + Conferma AI in the review wizard"
```

---

## Phase 10 — final verification

### Task 16: Full suite + typecheck + dogfood + final review

- [ ] **Step 1: Typecheck all touched packages**

```bash
cd packages/ai-review && npx tsc --noEmit
cd ../db && npx tsc --noEmit
cd ../../apps/web && npx tsc --noEmit
```
Expected: exit 0 each.

- [ ] **Step 2: Run the full non-browser suite**

Run (from repo root): `pnpm vitest run`
Expected: all green (existing 209 + the new ai-review/db/api tests).

- [ ] **Step 3: Run the web + ai-review browser suites**

```bash
pnpm vitest run -c vitest.browser.config.ts apps/web/tests/ai-review-button.browser.test.ts apps/web/tests/review-wizard.browser.test.ts packages/ai-review/tests/capture.browser.test.ts
```
Expected: all green (zero axe violations on new UI).

- [ ] **Step 4: Manual smoke (optional, needs a provider key)**

Set `AI_PROVIDER`/`AI_MODEL`/`AI_API_KEY` (or point at a local Ollama), start dev, open a DONE scan report, click "Pre-valuta con AI", confirm the wizard pre-fills suggestions, confirm one and check the verdict still requires human sign-off for CONFORME.

- [ ] **Step 5: Dispatch a final code-review subagent** over the whole feature branch (per subagent-driven-development), then finish the branch with `superpowers:finishing-a-development-branch`.

---

## Self-Review (plan vs spec)

- **Spec §3 pipeline** → Tasks 3 (cluster), 8 (evaluate+verify), 4 (aggregate), 9 (capture), 10/12 (orchestrate), 11 (persist). ✓
- **Spec §4 providers** → Tasks 5 (interface+env), 6 (adapters). ✓
- **Spec §5 data model** → Task 11 (schema + migration). ✓
- **Spec §6 web integration** → Tasks 13 (API), 14 (button), 15 (wizard). ✓
- **Spec §7 invariant** → enforced in Task 11 (`persistAiSuggestions` never writes state/source) + Task 11 test + Task 15 (confirm reuses human `decide`). ✓
- **Spec §8 error handling** → retry (Task 6), capture-skip + cancel (Task 10), FAILED status (Task 12/13). ✓
- **Spec §9 cost guards** → `maxClusters` (Task 10/12), in-scope-only criteria (Task 1 + `isInScope` filter in Task 10), confidence threshold (Task 4/12), timeouts (Task 6). ✓
- **Spec §10 testing** → every task is TDD; provider injected everywhere; invariant + integration + browser-axe covered. ✓
- **Spec §11 out of scope** → no vision/screenshot task; on-demand only; sampled only. ✓
