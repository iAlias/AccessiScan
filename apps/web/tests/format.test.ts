import { expect, test } from "vitest";
import {
  verdictLabel, scoreLabel, coverageLabel, criterionStateLabel, scanStatusLabel, formatDate,
} from "../src/lib/format.js";

test("verdictLabel maps enum to Italian text", () => {
  expect(verdictLabel("NON_CONFORME")).toBe("Non conforme");
  expect(verdictLabel("PARZIALMENTE")).toBe("Parzialmente conforme");
  expect(verdictLabel("NON_DETERMINABILE")).toBe("Non determinabile");
  expect(verdictLabel("CONFORME")).toBe("Conforme");
  expect(verdictLabel(null)).toBe("—");
});

test("scoreLabel shows number or dash", () => {
  expect(scoreLabel(42)).toBe("42");
  expect(scoreLabel(42.6)).toBe("43");
  expect(scoreLabel(null)).toBe("—");
});

test("coverageLabel formats ratio as percent", () => {
  expect(coverageLabel(0.04)).toBe("4%");
  expect(coverageLabel(null)).toBe("—");
});

test("criterionStateLabel maps states", () => {
  expect(criterionStateLabel("PASS")).toBe("Superato");
  expect(criterionStateLabel("FAIL")).toBe("Fallito");
  expect(criterionStateLabel("NEEDS_MANUAL_REVIEW")).toBe("Verifica manuale");
  expect(criterionStateLabel("NOT_APPLICABLE")).toBe("Non applicabile");
});

test("scanStatusLabel maps statuses", () => {
  expect(scanStatusLabel("QUEUED")).toBe("In coda");
  expect(scanStatusLabel("RUNNING")).toBe("In corso");
  expect(scanStatusLabel("DONE")).toBe("Completata");
  expect(scanStatusLabel("FAILED")).toBe("Fallita");
});

test("formatDate handles null", () => {
  expect(formatDate(null)).toBe("—");
  expect(formatDate(new Date("2026-06-16T10:00:00Z"))).toMatch(/2026/);
});
