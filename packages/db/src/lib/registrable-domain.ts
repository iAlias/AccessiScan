import { getDomain } from "tldts";

export function registrableDomain(url: string): string {
  const d = getDomain(url);
  if (!d) throw new Error(`Cannot derive registrable domain from: ${url}`);
  return d;
}
