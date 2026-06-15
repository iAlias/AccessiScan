import { expect, test } from "vitest";
import { createProjectSchema, createDomainSchema } from "../src/index.js";

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
