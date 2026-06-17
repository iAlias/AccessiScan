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
