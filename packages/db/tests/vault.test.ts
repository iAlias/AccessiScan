import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { randomBytes } from "node:crypto";
import {
  CURRENT_KEY_ID,
  decryptSecret,
  encryptSecret,
  PlaintextCache,
  resetMasterKeyCache,
  secretsEqual,
} from "../src/lib/vault.js";

// VAULT_MASTER_KEY is provided via .env.test (a base64 32-byte key).
const ORIGINAL_KEY = process.env.VAULT_MASTER_KEY;

beforeEach(() => {
  process.env.VAULT_MASTER_KEY = ORIGINAL_KEY;
  resetMasterKeyCache();
});

afterEach(() => {
  process.env.VAULT_MASTER_KEY = ORIGINAL_KEY;
  resetMasterKeyCache();
});

describe("envelope encryption round-trip", () => {
  test("encrypt then decrypt recovers the plaintext", () => {
    const secret = "hunter2-Päßwörd-🔐";
    const row = encryptSecret(secret);
    expect(decryptSecret(row)).toBe(secret);
  });

  test("handles empty and long secrets", () => {
    for (const secret of ["", "x", "a".repeat(10_000)]) {
      expect(decryptSecret(encryptSecret(secret))).toBe(secret);
    }
  });

  test("emits the expected fields, all base64, with correct sizes", () => {
    const row = encryptSecret("s3cr3t");
    expect(row.keyId).toBe(CURRENT_KEY_ID);
    // iv is 12 bytes, authTag is 16 bytes
    expect(Buffer.from(row.iv, "base64").length).toBe(12);
    expect(Buffer.from(row.authTag, "base64").length).toBe(16);
    // wrappedDek = iv(12) || authTag(16) || wrapped DEK(32) = 60 bytes
    expect(Buffer.from(row.wrappedDek, "base64").length).toBe(12 + 16 + 32);
    // base64 round-trips back to identical bytes (i.e. it really is base64)
    for (const f of [row.ciphertext, row.iv, row.authTag, row.wrappedDek]) {
      expect(Buffer.from(f, "base64").toString("base64")).toBe(f);
    }
  });

  test("each encryption uses a fresh DEK and IVs (non-deterministic)", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.wrappedDek).not.toBe(b.wrappedDek);
    expect(decryptSecret(a)).toBe("same");
    expect(decryptSecret(b)).toBe("same");
  });
});

describe("integrity / tamper detection (GCM auth)", () => {
  test("tampered ciphertext fails to decrypt", () => {
    const row = encryptSecret("secret");
    const bytes = Buffer.from(row.ciphertext, "base64");
    bytes[0] ^= 0xff;
    const tampered = { ...row, ciphertext: bytes.toString("base64") };
    expect(() => decryptSecret(tampered)).toThrow();
  });

  test("tampered authTag fails to decrypt", () => {
    const row = encryptSecret("secret");
    const bytes = Buffer.from(row.authTag, "base64");
    bytes[0] ^= 0xff;
    expect(() => decryptSecret({ ...row, authTag: bytes.toString("base64") })).toThrow();
  });

  test("tampered wrappedDek fails to unwrap", () => {
    const row = encryptSecret("secret");
    const bytes = Buffer.from(row.wrappedDek, "base64");
    bytes[bytes.length - 1] ^= 0xff;
    expect(() => decryptSecret({ ...row, wrappedDek: bytes.toString("base64") })).toThrow();
  });
});

describe("master key loading & validation", () => {
  test("rejects a key that is not 32 bytes", () => {
    process.env.VAULT_MASTER_KEY = randomBytes(16).toString("base64");
    resetMasterKeyCache();
    expect(() => encryptSecret("x")).toThrow(/exactly 32 bytes/);
  });

  test("rejects a missing key", () => {
    delete process.env.VAULT_MASTER_KEY;
    resetMasterKeyCache();
    expect(() => encryptSecret("x")).toThrow(/missing master key/);
  });

  test("decrypt with the wrong master key throws", () => {
    const row = encryptSecret("secret");
    process.env.VAULT_MASTER_KEY = randomBytes(32).toString("base64");
    resetMasterKeyCache();
    expect(() => decryptSecret(row)).toThrow();
  });

  test("unknown keyId throws a clear error", () => {
    const row = { ...encryptSecret("secret"), keyId: "v99" };
    expect(() => decryptSecret(row)).toThrow(/no master key configured for keyId/);
  });
});

describe("PlaintextCache", () => {
  test("caches within TTL and reloads after invalidation", () => {
    const cache = new PlaintextCache(10_000);
    let calls = 0;
    const loader = () => {
      calls++;
      return "value";
    };
    expect(cache.get("k", loader)).toBe("value");
    expect(cache.get("k", loader)).toBe("value");
    expect(calls).toBe(1);
    cache.invalidate("k");
    expect(cache.get("k", loader)).toBe("value");
    expect(calls).toBe(2);
  });
});

describe("secretsEqual", () => {
  test("true for equal, false for different or different-length", () => {
    expect(secretsEqual("abc", "abc")).toBe(true);
    expect(secretsEqual("abc", "abd")).toBe(false);
    expect(secretsEqual("abc", "abcd")).toBe(false);
  });
});
