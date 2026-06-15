import { expect, test } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password.js";

test("hashPassword produces a verifiable hash", async () => {
  const hash = await hashPassword("S3cret!");
  expect(hash).not.toBe("S3cret!");
  expect(await verifyPassword("S3cret!", hash)).toBe(true);
});

test("verifyPassword rejects a wrong password", async () => {
  const hash = await hashPassword("S3cret!");
  expect(await verifyPassword("wrong", hash)).toBe(false);
});
