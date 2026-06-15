import { expect, test } from "vitest";
import { deriveCriterionState, deriveAllStates } from "../src/criterion-states.js";
import { automatabilityOf } from "../src/wcag-catalog.js";

const f = (...x: string[]) => new Set(x);

test("precedence: FAIL > review > none-review > full-PASS > partial-review", () => {
  expect(deriveCriterionState("1.4.3", f("1.4.3"), f("1.4.3"), automatabilityOf)).toBe("FAIL");
  expect(deriveCriterionState("1.4.3", f(), f("1.4.3"), automatabilityOf)).toBe("NEEDS_MANUAL_REVIEW");
  expect(deriveCriterionState("1.2.1", f(), f(), automatabilityOf)).toBe("NEEDS_MANUAL_REVIEW");
  expect(deriveCriterionState("2.4.2", f(), f(), automatabilityOf)).toBe("PASS");
  expect(deriveCriterionState("1.4.3", f(), f(), automatabilityOf)).toBe("NEEDS_MANUAL_REVIEW");
});
test("a clean automated run PASSes only the 2 full criteria", () => {
  const states = deriveAllStates(f(), f());
  expect(states.size).toBe(50);
  const passed = [...states.entries()].filter(([, s]) => s === "PASS").map(([sc]) => sc).sort();
  expect(passed).toEqual(["2.4.2", "3.1.1"]);
});
