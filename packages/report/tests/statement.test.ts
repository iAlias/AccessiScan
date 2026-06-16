import { expect, test } from "vitest";
import { draftStatement, type StatementInput } from "../src/statement.js";

const base: StatementInput = {
  registrableDomain: "a.it",
  scanDate: "2026-06-16T00:00:00.000Z",
  criteria: [{ wcagSc: "2.4.2", state: "PASS" }, { wcagSc: "1.2.1", state: "NEEDS_MANUAL_REVIEW" }],
  issues: [],
  today: new Date("2026-06-16T00:00:00.000Z"),
};

test("no FAIL → PARZIALMENTE (never CONFORME)", () => {
  const s = draftStatement(base);
  expect(s.conformanceStatus).toBe("PARZIALMENTE");
});

test("any FAIL → NON_CONFORME", () => {
  const s = draftStatement({ ...base, criteria: [...base.criteria, { wcagSc: "1.4.3", state: "FAIL" }] });
  expect(s.conformanceStatus).toBe("NON_CONFORME");
});

test("method is automated; review due is +1 year; non-accessible content seeded from issues", () => {
  const s = draftStatement({ ...base, issues: [{ ruleId: "color-contrast", wcagSc: "1.4.3" }] });
  expect(s.method).toBe("autovalutazione automatizzata");
  expect(s.nextReviewDue.toISOString()).toBe("2027-06-16T00:00:00.000Z");
  expect(s.nonAccessibleContent.inosservanzaL4_2004.length).toBe(1);
  expect(s.nonAccessibleContent.onereSproporzionato).toEqual([]);
  expect(s.nonAccessibleContent.fuoriAmbito).toEqual([]);
  expect(s.conformanceStatus).not.toBe("CONFORME");
});
