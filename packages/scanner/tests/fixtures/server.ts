import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { PAGES } from "./site.js";

export interface FixtureServer {
  base: string;
  url: (p: string) => string;
  close: () => Promise<void>;
}

export async function startFixtureServer(): Promise<FixtureServer> {
  let base = "";
  const server: Server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    const f = PAGES[path];
    if (!f) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": f.type });
    res.end(f.body.replaceAll("__BASE__", base));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
  return {
    base,
    url: (p: string) => new URL(p, base).toString(),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
