import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * A small auth-gated fixture site. Every content page redirects to /login
 * unless the request carries the `sid=ok` cookie. Used to prove that an
 * authenticated scan logs in, crawls behind the gate, and marks pages AUTHED.
 */
export interface AuthedSiteServer {
  base: string;
  url: (p: string) => string;
  close: () => Promise<void>;
}

const LOGIN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Login</title></head>
<body><main><h1>Login</h1><form method="POST" action="/login">
<input name="email" type="email"><input name="password" type="password">
<button type="submit">Sign in</button></form></main></body></html>`;

const HOME_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Home</title></head>
<body><main><h1 id="home">Member home</h1><a href="/dashboard">Dashboard</a></main></body></html>`;

// Protected page carries a known axe violation (img with no alt → image-alt).
const DASHBOARD_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dashboard</title></head>
<body><main><h1>Dashboard</h1><img src="/x.png"></main></body></html>`;

export async function startAuthedSiteServer(): Promise<AuthedSiteServer> {
  const server: Server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    const authed = (req.headers.cookie ?? "").includes("sid=ok");

    if (path === "/login" && req.method === "POST") {
      res.writeHead(302, { Location: "/", "Set-Cookie": "sid=ok; Path=/; HttpOnly" });
      res.end();
      return;
    }
    if (path === "/login") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(LOGIN_HTML);
      return;
    }
    const gated: Record<string, string> = { "/": HOME_HTML, "/dashboard": DASHBOARD_HTML };
    const body = gated[path];
    if (body !== undefined) {
      if (!authed) { res.writeHead(302, { Location: "/login" }); res.end(); return; }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
      return;
    }
    // robots.txt / sitemap.xml / anything else → 404 (crawl falls back gracefully)
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    url: (p: string) => new URL(p, base).toString(),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
