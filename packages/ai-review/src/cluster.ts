import type { PageRef, PageCluster } from "./types.js";

/** Normalize a URL path into a template shape: numeric/slug segments → ":seg". */
function urlShape(url: string): string {
  let path: string;
  try { path = new URL(url).pathname; } catch { path = url; }
  return path
    .split("/")
    .map((seg) => (/^[0-9]+$/.test(seg) || /\d/.test(seg) ? ":seg" : seg))
    .join("/");
}

function clusterKey(p: PageRef): string {
  return `${urlShape(p.url)}|${[...p.ruleIds].sort().join(",")}`;
}

/**
 * Group pages by (url shape, axe rule set). Returns at most `cap` clusters,
 * keeping the largest; each cluster's representative is its first page by id.
 */
export function clusterPages(pages: PageRef[], cap: number): PageCluster[] {
  const groups = new Map<string, PageRef[]>();
  for (const p of pages) {
    const k = clusterKey(p);
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }
  const clusters: PageCluster[] = [...groups.entries()].map(([key, ps]) => ({
    key,
    representative: [...ps].sort((a, b) => a.id.localeCompare(b.id))[0]!,
    size: ps.length,
  }));
  clusters.sort((a, b) => b.size - a.size || a.key.localeCompare(b.key));
  return clusters.slice(0, cap);
}
