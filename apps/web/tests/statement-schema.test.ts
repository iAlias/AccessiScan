import { expect, test } from "vitest";
import { statementSchema } from "@accessscan/validation";

const valid = {
  conformanceStatus: "PARZIALMENTE",
  nonAccessibleContent: { inosservanzaL4_2004: ["x"], onereSproporzionato: [], fuoriAmbito: [] },
  feedbackContact: "a@b.it", enforcementRoute: "AgID",
};

test("accepts PARZIALMENTE and NON_CONFORME", () => {
  expect(statementSchema.safeParse(valid).success).toBe(true);
  expect(statementSchema.safeParse({ ...valid, conformanceStatus: "NON_CONFORME" }).success).toBe(true);
});

test("rejects CONFORME (automated method invariant)", () => {
  expect(statementSchema.safeParse({ ...valid, conformanceStatus: "CONFORME" }).success).toBe(false);
});
