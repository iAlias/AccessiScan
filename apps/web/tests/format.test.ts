import { expect, test } from "vitest";
import {
  verdictLabel, scoreLabel, coverageLabel, criterionStateLabel, scanStatusLabel, formatDate,
  impactLabel, impactRank, impactTone, formatInt,
} from "../src/lib/format.js";

test("verdictLabel maps enum to Italian text", () => {
  expect(verdictLabel("NON_CONFORME")).toBe("Non conforme");
  expect(verdictLabel("PARZIALMENTE")).toBe("Parzialmente conforme");
  expect(verdictLabel("NON_DETERMINABILE")).toBe("Non determinabile");
  expect(verdictLabel("CONFORME")).toBe("Conforme");
  expect(verdictLabel(null)).toBe("—");
  expect(verdictLabel(undefined)).toBe("—");
});

test("scoreLabel shows number or dash", () => {
  expect(scoreLabel(42)).toBe("42");
  expect(scoreLabel(42.6)).toBe("43");
  expect(scoreLabel(null)).toBe("—");
  expect(scoreLabel(0)).toBe("0");
  expect(scoreLabel(undefined)).toBe("—");
});

test("coverageLabel formats ratio as percent", () => {
  expect(coverageLabel(0.04)).toBe("4%");
  expect(coverageLabel(null)).toBe("—");
  expect(coverageLabel(0)).toBe("0%");
  expect(coverageLabel(undefined)).toBe("—");
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

test("impactLabel maps severity to Italian", () => {
  expect(impactLabel("CRITICAL")).toBe("Critico");
  expect(impactLabel("SERIOUS")).toBe("Serio");
  expect(impactLabel("MODERATE")).toBe("Moderato");
  expect(impactLabel("MINOR")).toBe("Minore");
  expect(impactLabel(null)).toBe("Non classificato");
});

test("impactRank orders most-severe first, nulls last", () => {
  expect(impactRank("CRITICAL")).toBeLessThan(impactRank("SERIOUS"));
  expect(impactRank("MINOR")).toBeLessThan(impactRank(null));
});

test("impactTone returns CSS modifier key", () => {
  expect(impactTone("CRITICAL")).toBe("critical");
  expect(impactTone("MINOR")).toBe("minor");
  expect(impactTone(null)).toBe("muted");
});

test("formatInt groups thousands in Italian locale", () => {
  expect(formatInt(16814)).toBe("16.814");
  expect(formatInt(0)).toBe("0");
  expect(formatInt(999)).toBe("999");
});
