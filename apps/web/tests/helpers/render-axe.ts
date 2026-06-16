import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { scanUrl } from "@accessscan/scanner";

const cssPath = fileURLToPath(new URL("../../src/app/dashboard.css", import.meta.url));
const CSS = readFileSync(cssPath, "utf8");

/**
 * Wrap a presentational component in a complete, landmark-correct HTML document
 * so axe judges only the component's own a11y (not missing page scaffolding).
 * Caller passes the visible <h1> via `heading`.
 */
export function pageHtml(heading: string, bodyHtml: string): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8">` +
    `<title>${heading}</title><style>${CSS}</style></head>` +
    `<body><a class="visually-hidden" href="#main">Salta</a>` +
    `<main id="main"><h1>${heading}</h1>${bodyHtml}</main></body></html>`;
}

export interface AxeViolation { id: string; nodes: unknown[] }

/** Render element → wrap → serve → axe-scan. Returns axe violations. */
export async function axeScanElement(heading: string, el: ReactElement): Promise<AxeViolation[]> {
  const html = pageHtml(heading, renderToStaticMarkup(el));
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  try {
    const { violations } = await scanUrl(`http://127.0.0.1:${port}/`);
    return violations as AxeViolation[];
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}
