import { expect, test } from "vitest";
import { clusterPages } from "../src/cluster.js";
import type { PageRef } from "../src/types.js";

const p = (id: string, url: string, ruleIds: string[]): PageRef => ({ id, url, ruleIds });

test("groups pages with the same url-shape and rule set into one cluster", () => {
  const pages = [
    p("1", "https://a.it/prodotto/123", ["image-alt", "color-contrast"]),
    p("2", "https://a.it/prodotto/456", ["color-contrast", "image-alt"]),
    p("3", "https://a.it/categoria/abc", ["link-name"]),
  ];
  const clusters = clusterPages(pages, 8);
  expect(clusters.length).toBe(2);
  const sizes = clusters.map((c) => c.size).sort();
  expect(sizes).toEqual([1, 2]);
});

test("caps the number of clusters, keeping the largest", () => {
  const pages: PageRef[] = [];
  for (let i = 0; i < 20; i++) pages.push(p(String(i), `https://a.it/t${i}/x`, [`rule${i}`]));
  const clusters = clusterPages(pages, 5);
  expect(clusters.length).toBe(5);
});

test("returns [] for no pages", () => {
  expect(clusterPages([], 8)).toEqual([]);
});
