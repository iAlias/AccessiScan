import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface AuthFixtureServer {
  base: string;
  url: (p: string) => string;
  expireSession: () => void;
  close: () => Promise<void>;
}

const LOGIN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Login</title></head>
<body><main><h1>Login</h1><form method="POST" action="/login">
<input name="email" type="email"><input name="password" type="password">
<button type="submit">Sign in</button></form></main></body></html>`;

const ACCOUNT_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Account</title></head>
<body><main><h1 id="account">Account</h1><img src="/x.png"></main></body></html>`;

export async function startAuthFixtureServer(): Promise<AuthFixtureServer> {
  let valid = true;
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const path = url.pathname;
    const authed = valid && (req.headers.cookie ?? "").includes("sid=ok");
    if (path === "/login" && req.method === "POST") {
      res.writeHead(302, { Location: "/account", "Set-Cookie": "sid=ok; Path=/; HttpOnly" });
      res.end();
      return;
    }
    if (path === "/login") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(LOGIN_HTML);
      return;
    }
    if (path === "/account") {
      if (!authed) { res.writeHead(302, { Location: "/login" }); res.end(); return; }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(ACCOUNT_HTML);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    url: (p) => new URL(p, base).toString(),
    expireSession: () => { valid = false; },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
