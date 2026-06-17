import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {}

/** True for private, loopback, link-local, unique-local, CGNAT, multicast and cloud-metadata addresses. */
export function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const a = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fe80")) return true; // link-local
    if (a.startsWith("fc") || a.startsWith("fd")) return true; // unique local
    const mapped = a.match(/(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]!);
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true; // malformed → treat as unsafe
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/**
 * SSRF guard: validate a URL is http(s) and does not target a private/loopback/
 * metadata address. DNS names are resolved and rejected if ANY resolved address
 * is private. Throws UnsafeUrlError otherwise; returns the parsed URL.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new UnsafeUrlError(`Invalid URL: ${raw}`); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UnsafeUrlError(`Disallowed protocol: ${u.protocol}`);
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) throw new UnsafeUrlError("localhost not allowed");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new UnsafeUrlError(`Private address not allowed: ${host}`);
    return u;
  }
  let addrs: Array<{ address: string }>;
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError(`DNS resolution failed: ${host}`);
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new UnsafeUrlError(`Resolves to a private address: ${host}`);
  }
  return u;
}

export async function isPublicUrl(raw: string): Promise<boolean> {
  try { await assertPublicUrl(raw); return true; } catch { return false; }
}

/**
 * SSRF guard for actual page navigation / fetching. Same as assertPublicUrl, but
 * honors ACCESSSCAN_ALLOW_LOOPBACK=1 so test suites can scan local 127.0.0.1
 * servers. The escape hatch is OFF by default and must never be set in production.
 */
export async function assertNavigableUrl(raw: string): Promise<void> {
  if (process.env.ACCESSSCAN_ALLOW_LOOPBACK === "1") return;
  await assertPublicUrl(raw);
}

/**
 * A fetchText that refuses unsafe URLs, follows redirects only to public targets,
 * and times out. Returns the body text or null (never throws).
 */
export function safeFetchText(opts?: { timeoutMs?: number; ua?: string; maxRedirects?: number }): (u: string) => Promise<string | null> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const maxRedirects = opts?.maxRedirects ?? 3;
  const headers = opts?.ua ? { "user-agent": opts.ua } : undefined;
  return async (start) => {
    let url = start;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      let safe: URL;
      try { safe = await assertPublicUrl(url); } catch { return null; }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(safe.toString(), { signal: ctrl.signal, redirect: "manual", headers });
        if (r.status >= 300 && r.status < 400) {
          const loc = r.headers.get("location");
          if (!loc) return null;
          url = new URL(loc, safe).toString(); // re-validated on next loop iteration
          continue;
        }
        return r.ok ? await r.text() : null;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
    return null; // too many redirects
  };
}
