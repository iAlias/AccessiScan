# AI Manual-Criteria Review — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming) — pending implementation plan
**Component:** new `packages/ai-review` + web/db integration

## 1. Goal

Add an **on-demand AI evaluation pass** that judges the WCAG 2.1 AA criteria an automated scanner cannot decide (the ~30 "manual" criteria), producing **reasoned, cited suggestions** that pre-populate the existing manual-review wizard. The AI proposes; a human confirms. The pass must **never** mark a criterion as human-reviewed and **never** unlock the `CONFORME` verdict on its own.

**Why:** axe/automation can fully certify only ~2 of 50 criteria and flag failures on ~20. The remaining criteria need human judgment. An LLM that reads the rendered DOM, accessibility tree and content can pre-judge most of them with reasoning, cutting the manual reviewer's work from "evaluate 43 criteria from scratch" to "confirm/correct ~25 pre-filled suggestions".

## 2. Locked decisions (from brainstorming)

1. **Scale:** representative sample of pages (cluster the scan's pages by template), not all 500.
2. **AI input:** text only — accessibility tree + rendered DOM excerpt + that page's axe findings. No screenshots in v1.
3. **Persistence/UI:** new suggestion fields on `CriterionResult`; the review wizard pre-fills from them.
4. **Trigger:** on-demand button on the report; runs in the background.
5. **Provider:** pluggable — Anthropic (default) + OpenAI-compatible adapter covering Grok, Groq, OpenRouter, Ollama/LM Studio.
6. **Orchestration:** Approach A — per-cluster agents (page-level criteria) + one site-level agent + adversarial verify on FAILs + aggregation.

## 3. Architecture & data flow

New package `packages/ai-review`. On "Pre-valuta con AI":

1. **Cluster (no AI calls):** group the scan's pages by `(URL path pattern, set of axe ruleIds present on the page)` → ~5–8 representative page-types. Uses data already in the DB (`Page.url`, `Issue`), so **no change to the scan hot path**. Cap at 8 clusters; log how many of N pages were sampled.
2. **Capture context (Playwright, representatives only):** re-render each representative URL, capture its accessibility tree + a trimmed DOM excerpt; attach the page's stored axe findings.
3. **Judge (LLM, structured output):**
   - one **cluster agent** per representative → evaluates the page-level manual criteria → per criterion `{verdict: PASS|FAIL|UNSURE, reasoning, evidenceSelector}`.
   - one **site agent** over the sample summary → site-level criteria (consistent navigation, multiple ways, consistent identification, …).
4. **Adversarial verify (FAILs only):** a second LLM call attempts to refute each FAIL; if not upheld, downgrade to UNSURE. Reduces false positives.
5. **Aggregate per criterion:** FAIL if any cluster fails; PASS if all clusters pass with sufficient confidence; otherwise UNSURE.
6. **Persist:** write the suggestion onto each `CriterionResult` (`aiState`, `aiReasoning`, `aiConfidence`, `aiEvidence`, `aiReviewedAt`). Never touches `state`/`source`.

Total ≈ 6–9 LLM calls per run, not 15 000.

### Units (each independently testable)

| Unit | Responsibility | Depends on |
|---|---|---|
| `clusterPages(pages, issuesByPage)` | group pages → clusters + representatives | pure |
| `LlmProvider` | `evaluate(prompt, schema) → validated JSON` | adapter (HTTP) |
| `capturePageContext(url, browser)` | a11y tree + DOM excerpt for a page | Playwright |
| `buildClusterPrompt` / `buildSitePrompt` | compose prompts with rubric + page context | catalog |
| `evaluateCluster` / `evaluateSite` | run an LLM judgment, parse+validate | LlmProvider |
| `verifyFail(suggestion, context)` | adversarial refute pass | LlmProvider |
| `aggregate(clusterResults, siteResults)` | per-criterion final suggestion | pure |
| `runAiReview(scanId, deps)` | orchestrate the pipeline | all above |
| `persistAiSuggestions(scanId, suggestions)` | write `ai*` columns | db |

## 4. Provider abstraction

```
interface LlmProvider {
  evaluate(input: { system: string; user: string; schema: JsonSchema }): Promise<unknown>; // validated against schema
}
```

Two adapters:
- **AnthropicProvider** — native Anthropic Messages API with tool/JSON output (default).
- **OpenAiCompatibleProvider** — chat-completions with JSON mode; works for xAI Grok, Groq (free tier), OpenRouter (free models), Ollama/LM Studio (local, free).

Selected via env:
```
AI_PROVIDER = anthropic | openai-compatible   (default: anthropic)
AI_MODEL    = e.g. claude-sonnet-4-6 | grok-2 | llama-3.3-70b
AI_BASE_URL = for Grok/Groq/OpenRouter/Ollama
AI_API_KEY  = provider key (omit for keyless local Ollama)
```

Output is always validated with a **zod** schema; malformed responses retry up to 2× before that criterion is dropped to UNSURE. **Caveat surfaced in the UI:** verdict quality depends on the model — strong models (Claude/GPT-4-class/Grok) are reliable; small free/local models are lower-accuracy and may need more retries.

## 5. Data model

`CriterionResult` gains (nullable, migration required):
- `aiState` `CriterionState?` — the AI suggestion (PASS / FAIL / NEEDS_MANUAL_REVIEW = unsure)
- `aiReasoning` `String?`
- `aiConfidence` `Float?` (0–1)
- `aiEvidence` `String?` — cited page URL + selector
- `aiReviewedAt` `DateTime?`

A run record is tracked on `Scan`: a new enum `AiReviewStatus { IDLE RUNNING DONE FAILED CANCELED }` with `aiReviewStatus AiReviewStatus @default(IDLE)`, `aiReviewError String?`, and `aiReviewCancelRequested Boolean @default(false)` (mirrors the existing scan-cancel flag).

## 6. Web integration

- **API:** `POST /api/scans/[id]/ai-review` (owner-gated via `requireScanOwner`) → starts `runAiReview` in the background (fire-and-forget like `runScan`), returns 202. `GET …/ai-review/status` for polling. `POST …/ai-review/cancel` reusing the cooperative-cancel pattern.
- **Report:** an `AiReviewButton` client component ("Pre-valuta con AI") with progress + the sampling note; visible to ADMIN.
- **Review wizard:** each pending criterion shows the AI suggestion (Pass/Fail/Incerto) + reasoning + evidence + confidence, with **Conferma** (accept → `state` = suggestion, `source` = MANUAL) and **Correggi** (manual override). UI must stay WCAG 2.1 AA (dogfood).

## 7. Invariant (must hold)

- The AI writes only `ai*` fields. It **never** sets `state` or `source`.
- Only a human **Conferma/Correggi** sets `source = MANUAL`.
- `recomputeVerdict` is unchanged: `CONFORME` still requires no `NEEDS_MANUAL_REVIEW`, no FAIL, and human sign-off. An AI-only scan can never reach `CONFORME`.

## 8. Error handling

- Provider missing/unreachable → run `FAILED` with reason; criteria untouched; UI prompts to configure the provider.
- Representative re-render fails → skip that cluster, note it, continue.
- Malformed model output → zod validate + ≤2 retries → else that criterion stays UNSURE.
- Low confidence / UNSURE → does **not** pre-fill (left to the human).
- Refuted FAIL → downgraded to UNSURE.
- Re-runnable (overwrites prior `ai*` values).

## 9. Cost & scale guards

- ≤ 8 representative pages per run; sampling surfaced in the UI ("valutate 7 pagine-tipo su 500").
- **In scope:** the manual (non-automatable) criteria that are text-judgeable. **Deferred to a future vision phase (stay human, no AI suggestion):** `1.4.1` Uso del colore, `1.4.5` Immagini di testo, `1.4.11` Contrasto non testuale, `2.4.7` Focus visibile, `1.3.3` Caratteristiche sensoriali. The pass only emits suggestions for criteria currently in `NEEDS_MANUAL_REVIEW` and not in this deferred set.
- A suggestion pre-fills the wizard only when verdict is PASS/FAIL **and** `aiConfidence ≥` a configurable threshold (default `0.7`); below that it is stored but shown as UNSURE and left for the human.
- Per-call timeout + overall run timeout; cancellable; concurrency cap on cluster calls.

## 10. Testing

No test hits a real LLM API — the `LlmProvider` is injected.

- **Unit:** `clusterPages` (deterministic clusters from fixtures); `aggregate` (FAIL-if-any, confidence threshold → UNSURE, PASS-if-all); provider adapters (mock HTTP: request shape, parse+validate, malformed→retry); prompt builders include a11y tree + axe findings + criterion rubric; `persistAiSuggestions` writes `ai*` and **not** `state`/`source`.
- **Invariant tests:** AI suggestions never set `source=MANUAL`; verdict stays `NON_CONFORME`; `CONFORME` locked with AI-only.
- **Integration:** `runAiReview` with a stub provider returning canned verdicts → asserts end-to-end aggregation + persistence.
- **Browser/axe:** the wizard's AI panel has zero axe violations.

## 11. Out of scope (v1)

- Screenshots / vision evaluation of the ~5 purely-visual criteria (future phase).
- Auto-running the AI pass on every scan (on-demand only).
- Per-page (non-sampled) evaluation.
- Streaming/partial UI of AI progress beyond a status badge.
