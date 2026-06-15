import { expect, test } from "vitest";
import { registrableDomain } from "../src/lib/registrable-domain.js";

test("extracts eTLD+1 from a full url", () => {
  expect(registrableDomain("https://www.pamacasa.it/spesa")).toBe("pamacasa.it");
});

test("handles bare host and subdomains", () => {
  expect(registrableDomain("https://shop.example.co.uk")).toBe("example.co.uk");
});

test("throws on an unparseable url", () => {
  expect(() => registrableDomain("not a url")).toThrow();
});
