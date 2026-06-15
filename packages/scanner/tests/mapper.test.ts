import { expect, test } from "vitest";
import { deriveWcagSc, parseWcagTag, en301549Clause, normalizeTarget } from "../src/mapper.js";

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
