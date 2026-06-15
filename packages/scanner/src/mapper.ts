import type { Result as AxeResult, NodeResult } from "axe-core";
import { issueFingerprint } from "./fingerprint.js";

const AXE_TAG_TO_SC: Record<string, string> = {
  wcag111: "1.1.1", wcag131: "1.3.1", wcag143: "1.4.3", wcag1410: "1.4.10",
  wcag1411: "1.4.11", wcag1412: "1.4.12", wcag1413: "1.4.13", wcag244: "2.4.4",
  wcag2410: "2.4.10", wcag253: "2.5.3", wcag258: "2.5.8", wcag412: "4.1.2",
};

/** Positional parse: major = 1 digit, minor = 1 digit, criterion = the rest. */
export function parseWcagTag(tag: string): string | null {
  const m = /^wcag(\d{3,})$/.exec(tag);
  if (!m) return null;
  const d = m[1];
  const criterion = d.slice(2).replace(/^0+(?=\d)/, "");
  return `${d[0]}.${d[1]}.${criterion}`;
}

export function deriveWcagSc(tags: string[]): string | null {
  const scTags = tags.filter((t) => /^wcag\d{3,}$/.test(t));
  if (scTags.length === 0) return null;
  scTags.sort();
  for (const t of scTags) if (AXE_TAG_TO_SC[t]) return AXE_TAG_TO_SC[t];
  return parseWcagTag(scTags[0]);
}

export function en301549Clause(wcagSc: string | null): string | null {
  return wcagSc ? `9.${wcagSc}` : null;
}

type AxeTarget = (string | string[])[];
export function normalizeTarget(target: AxeTarget | string | undefined): string {
  if (!target) return "";
  if (typeof target === "string") return target;
  const flatten = (t: unknown): string[] =>
    Array.isArray(t) ? t.flatMap(flatten) : typeof t === "string" ? [t] : [];
  return flatten(target).filter(Boolean).join(" >> ");
}

export type IssueImpact = "CRITICAL" | "SERIOUS" | "MODERATE" | "MINOR";

export interface IssueRowInput {
  ruleId: string;
  wcagSc: string | null;
  en301549Clause: string | null;
  impact: IssueImpact;
  help: string;
  helpUrl: string;
  htmlSnippet: string;
  targetSelector: string;
  failureSummary: string;
  fingerprint: string;
}

export function toIssueRow(rule: AxeResult, node: NodeResult): IssueRowInput {
  const wcagSc = deriveWcagSc(rule.tags);
  const targetSelector = normalizeTarget(node.target as unknown as (string | string[])[]);
  const htmlSnippet = node.html ?? "";
  const impactRaw = node.impact ?? rule.impact ?? "minor";
  return {
    ruleId: rule.id,
    wcagSc,
    en301549Clause: en301549Clause(wcagSc),
    impact: String(impactRaw).toUpperCase() as IssueImpact,
    help: rule.help,
    helpUrl: rule.helpUrl,
    htmlSnippet,
    targetSelector,
    failureSummary: node.failureSummary ?? "",
    fingerprint: issueFingerprint({ ruleId: rule.id, targetSelector, htmlSnippet }),
  };
}
