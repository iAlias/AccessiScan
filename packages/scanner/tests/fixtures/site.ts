export type Fixture = { body: string; type: string };
const html = (b: string): Fixture => ({ body: b, type: "text/html; charset=utf-8" });

export const PAGES: Record<string, Fixture> = {
  "/": html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Home</title></head>
<body><h1>Home</h1><a href="/about">About</a> <a href="/contact">Contact</a>
<img src="/logo.png"></body></html>`),
  "/about": html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>About</title></head>
<body><h1>About</h1><a href="/">Home</a> <a href="/contact">Contact</a>
<p style="color:#aaaaaa;background:#ffffff">low contrast text</p></body></html>`),
  "/contact": html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Contact</title></head>
<body><h1>Contact</h1><a href="/about">About</a><button></button></body></html>`),
  "/sitemap.xml": { type: "application/xml", body: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>__BASE__/</loc></url><url><loc>__BASE__/about</loc></url><url><loc>__BASE__/contact</loc></url>
</urlset>` },
  "/robots.txt": { type: "text/plain", body: `User-agent: *\nAllow: /\nSitemap: __BASE__/sitemap.xml\n` },
};
