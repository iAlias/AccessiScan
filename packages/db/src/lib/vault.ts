import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Credential } from "@prisma/client";

/**
 * Credential vault — AES-256-GCM envelope encryption.
 *
 * Per-credential design:
 *   1. A random 32-byte Data Encryption Key (DEK) is generated for every secret.
 *   2. The plaintext is encrypted with the DEK  -> { ciphertext, iv, authTag }.
 *   3. The DEK is wrapped (encrypted) with the master Key Encryption Key (KEK)
 *      -> packed into a single `wrappedDek` blob (iv || authTag || ciphertext).
 *   4. `keyId` records *which* master key version wrapped the DEK, so the master
 *      key can be rotated without re-encrypting the (large) ciphertext — only the
 *      tiny wrappedDek needs rewrapping.
 *
 * All emitted fields are base64 strings, matching the Prisma `Credential` row.
 *
 * ── THREAT MODEL ──────────────────────────────────────────────────────────────
 * PROTECTS:
 *   - Database-at-rest. An attacker with a DB dump / stolen backup / read access
 *     to Postgres sees only ciphertext + wrapped DEKs and CANNOT recover any
 *     secret without ALSO holding VAULT_MASTER_KEY.
 *   - Per-credential blast radius: each secret has its own DEK, so cracking/leaking
 *     one DEK exposes exactly one credential.
 *   - GCM provides confidentiality AND integrity: any tampering with ciphertext,
 *     iv, authTag, or wrappedDek fails authentication on decrypt (throws).
 *
 * DOES NOT PROTECT against:
 *   - Compromise of the running app/host: the master key lives in process env
 *     (`VAULT_MASTER_KEY`) and decrypted secrets pass through memory. Anyone with
 *     code-exec, a memory dump, or `/proc` access on the live host can read both.
 *   - A leaked master key. The master key is the single root of trust; if it
 *     leaks, every credential is decryptable. Store it in a secret manager /
 *     Docker secret / systemd `LoadCredential`, NOT in the DB or VCS, and keep it
 *     out of logs and crash reports.
 *   - Application-level misuse: SQL injection / authz bugs that let the app itself
 *     be coerced into decrypting and returning a secret to an attacker.
 *   - This is NOT an HSM/KMS. The key is plain bytes in env — acceptable for a
 *     self-hosted internal tool, but it offers no hardware key isolation and no
 *     audited central key custody.
 *
 * Operational notes:
 *   - Keep VAULT_MASTER_KEY stable; losing it makes every credential unrecoverable.
 *   - Rotation: add `v2` to the key map, set it as current, and lazily/eagerly
 *     rewrap each row's `wrappedDek` (see `rewrapDek`). The bulky ciphertext is
 *     never touched.
 */

// ── Algorithm constants ───────────────────────────────────────────────────────
const ALGO = "aes-256-gcm" as const;
const KEY_LEN = 32; // AES-256 => 32-byte keys (both DEK and master key)
const IV_LEN = 12; // 96-bit IV is the GCM standard / NIST-recommended length
const AUTH_TAG_LEN = 16; // GCM authentication tag, 128 bits

/** Shape returned by {@link encryptSecret}; lines up 1:1 with the Prisma row. */
export interface EncryptedSecret {
  ciphertext: string; // base64
  iv: string; // base64, 12 bytes
  authTag: string; // base64, 16 bytes
  wrappedDek: string; // base64 of (iv || authTag || wrappedCiphertext)
  keyId: string; // master key version that wrapped the DEK, e.g. "v1"
}

/** Just the encrypted fields of a Credential — accepts a full Prisma row too. */
export type EncryptedRow = Pick<
  Credential,
  "ciphertext" | "iv" | "authTag" | "wrappedDek" | "keyId"
>;

// ── Master key loading & rotation map ─────────────────────────────────────────

/**
 * The current (newest) master key version. New credentials are wrapped under
 * this id. To rotate, introduce a new id here and provide its key material via
 * the corresponding env var (see {@link loadMasterKeys}).
 */
export const CURRENT_KEY_ID = "v1";

/**
 * Env var name for each known master key version. During rotation you add the
 * new version's env var and keep the old one available so existing rows (still
 * wrapped under the old `keyId`) remain decryptable until rewrapped.
 */
const MASTER_KEY_ENV: Record<string, string> = {
  v1: "VAULT_MASTER_KEY",
  // v2: "VAULT_MASTER_KEY_V2",
};

/** Decode + validate a single base64 master key from an env var. */
function decodeMasterKey(keyId: string, envName: string): Buffer {
  const raw = process.env[envName];
  if (!raw || raw.length === 0) {
    throw new Error(
      `Credential vault: missing master key for keyId "${keyId}" ` +
        `(expected env var ${envName} to be set to a base64-encoded 32-byte key).`,
    );
  }
  // Buffer.from(..,"base64") is lenient and never throws, so validate the format
  // explicitly instead of relying on a catch that can never fire.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw new Error(`Credential vault: ${envName} is not valid base64 (keyId "${keyId}").`);
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LEN) {
    throw new Error(
      `Credential vault: ${envName} must decode to exactly ${KEY_LEN} bytes, ` +
        `got ${key.length} (keyId "${keyId}"). Generate one with: ` +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return key;
}

/**
 * Build the keyId -> 32-byte-key map from env. Called lazily and cached, so a
 * misconfigured key throws on first vault use (with a clear message) rather than
 * at import time. Every configured version is validated to be exactly 32 bytes.
 */
function loadMasterKeys(): Map<string, Buffer> {
  const map = new Map<string, Buffer>();
  for (const [keyId, envName] of Object.entries(MASTER_KEY_ENV)) {
    map.set(keyId, decodeMasterKey(keyId, envName));
  }
  if (!map.has(CURRENT_KEY_ID)) {
    throw new Error(
      `Credential vault: CURRENT_KEY_ID "${CURRENT_KEY_ID}" has no configured master key.`,
    );
  }
  return map;
}

let _masterKeys: Map<string, Buffer> | null = null;

function masterKeys(): Map<string, Buffer> {
  if (_masterKeys === null) _masterKeys = loadMasterKeys();
  return _masterKeys;
}

function masterKeyFor(keyId: string): Buffer {
  const key = masterKeys().get(keyId);
  if (!key) {
    throw new Error(
      `Credential vault: no master key configured for keyId "${keyId}". ` +
        `This row was encrypted with a key version that is no longer available.`,
    );
  }
  return key;
}

/**
 * Reset the cached master keys. Call after mutating process.env in tests, or to
 * force a re-read after a rotation that updated env in-process. Not needed in
 * normal operation.
 */
export function resetMasterKeyCache(): void {
  _masterKeys = null;
}

// ── Low-level AES-256-GCM helpers ─────────────────────────────────────────────

/** Encrypt `plaintext` under `key`; returns the three GCM outputs as buffers. */
function gcmEncrypt(
  key: Buffer,
  plaintext: Buffer,
): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
  const iv = randomBytes(IV_LEN); // fresh 12-byte IV per encryption — never reuse
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag(); // MUST be read AFTER final()
  return { iv, authTag, ciphertext };
}

/** Decrypt and authenticate; throws if the auth tag does not verify. */
function gcmDecrypt(
  key: Buffer,
  iv: Buffer,
  authTag: Buffer,
  ciphertext: Buffer,
): Buffer {
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag); // MUST be set BEFORE final()
  // decipher.final() throws "Unsupported state or unable to authenticate data"
  // if the tag/ciphertext/iv/key don't match — i.e. on tampering or wrong key.
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ── DEK wrapping (the "envelope") ─────────────────────────────────────────────

/**
 * Wrap a DEK with the master key and pack the result into ONE base64 string:
 *   base64( iv(12) || authTag(16) || wrappedCiphertext(32) )
 * Fixed-length prefixes make unpacking unambiguous.
 */
function wrapDek(dek: Buffer, masterKey: Buffer): string {
  const { iv, authTag, ciphertext } = gcmEncrypt(masterKey, dek);
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Reverse of {@link wrapDek}: unpack + decrypt to recover the raw 32-byte DEK. */
function unwrapDek(wrappedDek: string, masterKey: Buffer): Buffer {
  const packed = Buffer.from(wrappedDek, "base64");
  if (packed.length < IV_LEN + AUTH_TAG_LEN) {
    throw new Error("Credential vault: wrappedDek is malformed (too short).");
  }
  const iv = packed.subarray(0, IV_LEN);
  const authTag = packed.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const ciphertext = packed.subarray(IV_LEN + AUTH_TAG_LEN);
  const dek = gcmDecrypt(masterKey, iv, authTag, ciphertext);
  if (dek.length !== KEY_LEN) {
    throw new Error("Credential vault: unwrapped DEK has unexpected length.");
  }
  return dek;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext secret. Returns the five base64 fields to persist on the
 * Prisma `Credential` row. A fresh DEK and fresh IVs are generated every call.
 */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const keyId = CURRENT_KEY_ID;
  const masterKey = masterKeyFor(keyId);

  // 1. Per-credential DEK.
  const dek = randomBytes(KEY_LEN);

  // 2. Encrypt the secret with the DEK.
  const {
    iv,
    authTag,
    ciphertext,
  } = gcmEncrypt(dek, Buffer.from(plaintext, "utf8"));

  // 3. Wrap the DEK with the master key.
  const wrappedDek = wrapDek(dek, masterKey);

  // Best-effort hygiene: zero the raw DEK once it's wrapped.
  dek.fill(0);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    wrappedDek,
    keyId,
  };
}

/**
 * Decrypt a stored credential row back to its plaintext secret. Unwraps the DEK
 * with the master key identified by `row.keyId`, then decrypts the ciphertext.
 * Throws if the master key is unavailable or if any field has been tampered with.
 */
export function decryptSecret(row: EncryptedRow): string {
  const masterKey = masterKeyFor(row.keyId);

  // 1. Recover the DEK.
  const dek = unwrapDek(row.wrappedDek, masterKey);

  // 2. Decrypt the secret with the DEK.
  try {
    const plaintext = gcmDecrypt(
      dek,
      Buffer.from(row.iv, "base64"),
      Buffer.from(row.authTag, "base64"),
      Buffer.from(row.ciphertext, "base64"),
    );
    return plaintext.toString("utf8");
  } finally {
    dek.fill(0); // zero the recovered DEK regardless of success/failure
  }
}

/**
 * Master-key rotation helper. Re-wraps the DEK under the current master key
 * WITHOUT touching the (potentially large) ciphertext: unwrap with the old
 * key (identified by `row.keyId`), then wrap with `CURRENT_KEY_ID`.
 *
 * Returns the fields to update on the row (`wrappedDek` + `keyId`); ciphertext /
 * iv / authTag are unchanged. Returns `null` if the row is already on the current
 * key (no write needed). Run this lazily on read, or in a batch migration.
 */
export function rewrapDek(
  row: EncryptedRow,
): Pick<EncryptedSecret, "wrappedDek" | "keyId"> | null {
  if (row.keyId === CURRENT_KEY_ID) return null;
  const oldKey = masterKeyFor(row.keyId);
  const newKey = masterKeyFor(CURRENT_KEY_ID);
  const dek = unwrapDek(row.wrappedDek, oldKey);
  try {
    return { wrappedDek: wrapDek(dek, newKey), keyId: CURRENT_KEY_ID };
  } finally {
    dek.fill(0);
  }
}

// ── Optional per-process plaintext cache ──────────────────────────────────────
//
// Decryption is cheap (a few microseconds), so for an internal tool a cache is
// usually NOT worth it. The only real win is amortizing repeated decrypts of the
// same credential within a single scan run.
//
// TRADEOFF: a cache keeps PLAINTEXT secrets resident in heap memory for longer,
// widening the window in which a memory dump / heap snapshot leaks them, and
// risks staleness if a credential is rotated in the DB while cached. If you
// enable it, bound it (size + TTL) and clear it aggressively. Default: OFF.
//
// Below is a minimal, opt-in, TTL-bounded cache keyed by an opaque caller key
// (e.g. the Credential.id). It is intentionally NOT wired into decryptSecret.

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class PlaintextCache {
  private readonly store = new Map<string, CacheEntry>();
  constructor(private readonly ttlMs = 60_000) {}

  /** Return cached plaintext for `key`, or compute + cache it via `loader`. */
  get(key: string, loader: () => string): string {
    const now = Date.now();
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > now) return hit.value;
    const value = loader();
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
    return value;
  }

  /** Drop a single entry (call when a credential is rotated/deleted). */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Wipe everything (e.g. on master-key rotation or shutdown). */
  clear(): void {
    this.store.clear();
  }
}

// ── Misc ──────────────────────────────────────────────────────────────────────

/**
 * Constant-time comparison of two base64-encoded secrets. Useful when verifying
 * a presented secret against a freshly decrypted one without leaking length/early
 * mismatch timing. Returns false on length mismatch.
 */
export function secretsEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
