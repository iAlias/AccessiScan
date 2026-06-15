import { expect, test } from "vitest";
import { issueFingerprint, normalizeHtml } from "../src/fingerprint.js";

const base = { ruleId: "image-alt", targetSelector: "#a", htmlSnippet: "<img src=x>" };

test("stable for identical input", () => {
  expect(issueFingerprint(base)).toBe(issueFingerprint(base));
});
test("ignores whitespace/case-only html differences", () => {
  expect(issueFingerprint(base)).toBe(issueFingerprint({ ...base, htmlSnippet: "<IMG   src=x>" }));
});
test("differs on ruleId or selector", () => {
  expect(issueFingerprint(base)).not.toBe(issueFingerprint({ ...base, ruleId: "button-name" }));
  expect(issueFingerprint(base)).not.toBe(issueFingerprint({ ...base, targetSelector: "#b" }));
});
test("NUL delimiter prevents field-boundary collision", () => {
  expect(issueFingerprint({ ruleId: "a", targetSelector: "bc", htmlSnippet: "" }))
    .not.toBe(issueFingerprint({ ruleId: "ab", targetSelector: "c", htmlSnippet: "" }));
});
test("normalizeHtml collapses whitespace and lowercases", () => {
  expect(normalizeHtml("<A   B>\n c")).toBe("<a b> c");
});
