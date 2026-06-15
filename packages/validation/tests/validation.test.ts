import { expect, test } from "vitest";
import { createProjectSchema, createDomainSchema } from "../src/index.js";
import { loginRecipeSchema, createCredentialSchema } from "../src/index.js";

test("createProjectSchema accepts a valid name", () => {
  expect(createProjectSchema.parse({ name: "Pam" })).toEqual({ name: "Pam" });
});

test("createProjectSchema rejects an empty name", () => {
  expect(createProjectSchema.safeParse({ name: "" }).success).toBe(false);
});

test("createDomainSchema requires an http(s) url", () => {
  expect(createDomainSchema.safeParse({ baseUrl: "ftp://x.it" }).success).toBe(false);
  expect(createDomainSchema.parse({ baseUrl: "https://pamacasa.it" }).baseUrl).toBe(
    "https://pamacasa.it",
  );
});

test("createDomainSchema allows an optional partial crawl config", () => {
  const parsed = createDomainSchema.parse({
    baseUrl: "https://pamacasa.it",
    crawlConfig: { maxPages: 100 },
  });
  expect(parsed.crawlConfig?.maxPages).toBe(100);
});

test("loginRecipeSchema accepts a valid recipe, rejects bad action/url", () => {
  const ok = loginRecipeSchema.safeParse({
    loginUrl: "https://a.it/login",
    steps: [{ action: "fill", selector: "#e", valueRef: "email" }, { action: "click", selector: "button" }],
    waitFor: { type: "urlContains", value: "/account" },
    successCheck: { type: "selector", value: "#account" },
  });
  expect(ok.success).toBe(true);
  expect(loginRecipeSchema.safeParse({ loginUrl: "ftp://x", steps: [], waitFor: { type: "selector", value: "a" }, successCheck: { type: "selector", value: "a" } }).success).toBe(false);
  expect(loginRecipeSchema.safeParse({ loginUrl: "https://a.it/login", steps: [{ action: "tap", selector: "#e" }], waitFor: { type: "selector", value: "a" }, successCheck: { type: "selector", value: "a" } }).success).toBe(false);
});
test("createCredentialSchema requires label + non-empty secret", () => {
  expect(createCredentialSchema.safeParse({ label: "email", secret: "x" }).success).toBe(true);
  expect(createCredentialSchema.safeParse({ label: "email", secret: "" }).success).toBe(false);
  expect(createCredentialSchema.safeParse({ label: "", secret: "x" }).success).toBe(false);
});
