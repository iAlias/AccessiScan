export function canonicalizeUrl(input: string, base?: string): string | null {
  let u: URL;
  try {
    u = new URL(input, base);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  u.username = "";
  u.password = "";
  if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) {
    u.port = "";
  }
  const TRACKING = /^(utm_|mc_|_hs|ref$|ref_src$)/i;
  const DROP = new Set(["gclid", "fbclid", "dclid", "gclsrc", "msclkid", "yclid", "mkt_tok", "igshid", "_ga", "_gl"]);
  const params = [...u.searchParams.entries()].filter(
    ([k]) => !TRACKING.test(k) && !DROP.has(k.toLowerCase()),
  );
  params.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  u.search = "";
  for (const [k, v] of params) u.searchParams.append(k, v);
  let path = u.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  u.pathname = path === "" ? "/" : path;
  return u.toString();
}
