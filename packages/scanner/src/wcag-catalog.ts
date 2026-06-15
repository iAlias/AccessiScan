export type SCId = string;
export type Automatability = "full" | "partial" | "none";
export interface CatalogEntry {
  sc: SCId;
  level: "A" | "AA";
  automatability: Automatability;
}

const RAW = `1.1.1|A|partial 1.2.1|A|none 1.2.2|A|partial 1.2.3|A|none 1.2.4|AA|none
1.2.5|AA|none 1.3.1|A|partial 1.3.2|A|none 1.3.3|A|none 1.3.4|AA|none
1.3.5|AA|partial 1.4.1|A|none 1.4.2|A|partial 1.4.3|AA|partial 1.4.4|AA|partial
1.4.5|AA|none 1.4.10|AA|partial 1.4.11|AA|none 1.4.12|AA|partial 1.4.13|AA|none
2.1.1|A|partial 2.1.2|A|none 2.1.4|A|none 2.2.1|A|partial 2.2.2|A|partial
2.3.1|A|none 2.4.1|A|partial 2.4.2|A|full 2.4.3|A|none 2.4.4|A|partial
2.4.5|AA|none 2.4.6|AA|none 2.4.7|AA|none 2.5.1|A|none 2.5.2|A|none
2.5.3|A|none 2.5.4|A|none 3.1.1|A|full 3.1.2|AA|partial 3.2.1|A|none
3.2.2|A|none 3.2.3|AA|none 3.2.4|AA|none 3.3.1|A|none 3.3.2|A|partial
3.3.3|AA|none 3.3.4|AA|none 4.1.1|A|partial 4.1.2|A|partial 4.1.3|AA|none`;

export const WCAG_CATALOG: readonly CatalogEntry[] = RAW.trim().split(/\s+/).map((row) => {
  const [sc, level, automatability] = row.split("|");
  return { sc: sc!, level: level as "A" | "AA", automatability: automatability as Automatability };
});

export const CATALOG_TOTAL = WCAG_CATALOG.length;

const BY_SC = new Map<SCId, CatalogEntry>(WCAG_CATALOG.map((e) => [e.sc, e]));
export const CATALOG_BY_SC: ReadonlyMap<SCId, CatalogEntry> = BY_SC;

export function automatabilityOf(sc: SCId): Automatability {
  return BY_SC.get(sc)?.automatability ?? "none";
}
