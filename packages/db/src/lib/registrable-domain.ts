import { getDomain } from "tldts";

export function registrableDomain(url: string): string {
  const d = getDomain(url);
  if (d) return d;
  // Fallback for IP addresses and localhost (e.g. http://127.0.0.1:PORT)
  try {
    const { hostname } = new URL(url);
    if (hostname) return hostname;
  } catch {
    // ignore parse errors
  }
  throw new Error(`Cannot derive registrable domain from: ${url}`);
}
