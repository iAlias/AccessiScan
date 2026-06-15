import { createHash } from "node:crypto";

function sha1(s: string): string {
  return createHash("sha1").update(s, "utf8").digest("hex");
}

export function normalizeHtml(html: string): string {
  return (html ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function issueFingerprint(input: {
  ruleId: string;
  targetSelector: string;
  htmlSnippet: string;
}): string {
  const contentHash = sha1(normalizeHtml(input.htmlSnippet));
  const NUL = "\0";
  return sha1([input.ruleId, input.targetSelector.trim(), contentHash].join(NUL));
}
