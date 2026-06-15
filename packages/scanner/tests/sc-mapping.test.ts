import { expect, test } from "vitest";
import { tagToSCId, collectSCSets, collectPageFindings } from "../src/sc-mapping.js";

test("tagToSCId maps catalog SC tags only", () => {
  expect(tagToSCId("wcag143")).toBe("1.4.3");
  expect(tagToSCId("wcag2aa")).toBeNull();
  expect(tagToSCId("wcag999")).toBeNull();
});
test("collectSCSets splits violations->fail, incomplete->review (multi-SC rules)", () => {
  const axe = {
    violations: [{ tags: ["wcag111", "wcag412"], nodes: [{ impact: "critical" }] }],
    incomplete: [{ tags: ["wcag143"], nodes: [{ impact: null }] }],
  };
  const { failSCs, reviewSCs } = collectSCSets(axe as never);
  expect([...failSCs].sort()).toEqual(["1.1.1", "4.1.2"]);
  expect([...reviewSCs]).toEqual(["1.4.3"]);
});
test("collectPageFindings counts nodes and max impact per SC", () => {
  const axe = {
    violations: [
      { tags: ["wcag143"], nodes: [{ impact: "serious" }, { impact: "critical" }] },
      { tags: ["wcag412"], nodes: [{ impact: "moderate" }] },
    ],
    incomplete: [],
  };
  const f = collectPageFindings(axe as never).sort((a, b) => a.sc.localeCompare(b.sc));
  expect(f).toEqual([
    { sc: "1.4.3", affectedNodes: 2, maxImpact: "critical" },
    { sc: "4.1.2", affectedNodes: 1, maxImpact: "moderate" },
  ]);
});
