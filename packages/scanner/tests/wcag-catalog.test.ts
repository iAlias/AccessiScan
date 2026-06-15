import { expect, test } from "vitest";
import { WCAG_CATALOG, CATALOG_TOTAL, automatabilityOf } from "../src/wcag-catalog.js";

test("has exactly 50 criteria with the right bucket counts", () => {
  expect(WCAG_CATALOG.length).toBe(50);
  expect(CATALOG_TOTAL).toBe(50);
  const c = (a: string) => WCAG_CATALOG.filter((x) => x.automatability === a).length;
  expect(c("full")).toBe(2);
  expect(c("partial")).toBe(18);
  expect(c("none")).toBe(30);
});
test("automatabilityOf resolves known criteria and defaults unknown to none", () => {
  expect(automatabilityOf("2.4.2")).toBe("full");
  expect(automatabilityOf("3.1.1")).toBe("full");
  expect(automatabilityOf("1.4.3")).toBe("partial");
  expect(automatabilityOf("1.2.1")).toBe("none");
  expect(automatabilityOf("9.9.9")).toBe("none");
});
test("every sc is well-formed and level is A or AA", () => {
  for (const e of WCAG_CATALOG) {
    expect(e.sc).toMatch(/^\d\.\d\.\d+$/);
    expect(["A", "AA"]).toContain(e.level);
  }
});
