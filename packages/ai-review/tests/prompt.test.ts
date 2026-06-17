import { expect, test } from "vitest";
import { buildClusterPrompt, buildVerifyPrompt } from "../src/prompt.js";
import type { PageContext } from "../src/types.js";

const ctx: PageContext = { url: "https://a.it/p", a11yTree: "TREE", domExcerpt: "<main>...</main>", axeFindings: [{ ruleId: "image-alt", impact: "critical", help: "alt", targetSelector: "img" }] };

test("cluster prompt includes the page url, a11y tree, axe findings and only page-level criteria", () => {
  const { user, system } = buildClusterPrompt(ctx, ["2.4.6", "3.2.1"]);
  expect(user).toContain("https://a.it/p");
  expect(user).toContain("TREE");
  expect(user).toContain("image-alt");
  expect(user).toContain("2.4.6");
  expect(system).toContain("JSON");
});

test("verify prompt frames the reviewer as a skeptic for a single FAIL", () => {
  const v = buildVerifyPrompt(ctx, { wcagSc: "2.4.6", verdict: "FAIL", confidence: 0.8, reasoning: "headings not descriptive" });
  expect(v.user).toContain("2.4.6");
  expect(v.user.toLowerCase()).toContain("refute");
});
