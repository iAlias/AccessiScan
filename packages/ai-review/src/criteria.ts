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
