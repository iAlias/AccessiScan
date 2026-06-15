import { expect, test } from "vitest";
import { deriveWcagSc, parseWcagTag, en301549Clause, normalizeTarget } from "../src/mapper.js";
import { toIssueRow } from "../src/mapper.js";

test("parses multi-digit criteria correctly", () => {
  expect(parseWcagTag("wcag143")).toBe("1.4.3");
  expect(parseWcagTag("wcag1410")).toBe("1.4.10");
  expect(parseWcagTag("wcag1413")).toBe("1.4.13");
  expect(parseWcagTag("wcag2410")).toBe("2.4.10");
  expect(parseWcagTag("wcag258")).toBe("2.5.8");
});
test("deriveWcagSc ignores version/level tags", () => {
  expect(deriveWcagSc(["cat.color", "wcag2aa", "wcag21aa", "wcag143"])).toBe("1.4.3");
  expect(deriveWcagSc(["wcag2a", "wcag21aa"])).toBeNull();
  expect(deriveWcagSc([])).toBeNull();
});
test("en301549Clause prefixes chapter 9", () => {
  expect(en301549Clause("1.4.3")).toBe("9.1.4.3");
  expect(en301549Clause(null)).toBeNull();
});
test("normalizeTarget flattens frame chains", () => {
  expect(normalizeTarget(["#a"])).toBe("#a");
  expect(normalizeTarget([["iframe", "#inner"]])).toBe("iframe >> #inner");
  expect(normalizeTarget(undefined)).toBe("");
});

const rule = { id: "image-alt", impact: "critical", help: "Images need alt", helpUrl: "https://x", tags: ["wcag2a", "wcag111"] };
const node = { html: "<img src=x>", failureSummary: "fix it", target: ["#a"], impact: "critical" };

test("toIssueRow maps an axe node to an Issue row", () => {
  const row = toIssueRow(rule as never, node as never);
  expect(row.ruleId).toBe("image-alt");
  expect(row.wcagSc).toBe("1.1.1");
  expect(row.en301549Clause).toBe("9.1.1.1");
  expect(row.impact).toBe("CRITICAL");
  expect(row.targetSelector).toBe("#a");
  expect(row.helpUrl).toBe("https://x");
  expect(typeof row.fingerprint).toBe("string");
});
test("impact falls back node->rule->MINOR and uppercases", () => {
  const row = toIssueRow({ ...rule, impact: "serious" } as never, { ...node, impact: null } as never);
  expect(row.impact).toBe("SERIOUS");
});
