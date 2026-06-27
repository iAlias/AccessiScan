import { describe, it, expect } from "vitest";
import {
  computeCompleteness,
  wcagPrinciple,
  principleLabel,
  groupCriteriaByPrinciple,
  criterionStateTone,
} from "../src/lib/report-views.js";
import { safeExternalHref } from "../src/lib/format.js";

describe("computeCompleteness", () => {
  it("is the share of criteria decided with certainty (pass+fail+na over total)", () => {
    // 11 decided (pass) + 0 fail + 0 na, 1 needs review → 11/12
    expect(computeCompleteness({ pass: 11, fail: 0, na: 0, needsReview: 1 })).toBeCloseTo(11 / 12);
  });

  it("counts NOT_APPLICABLE as decided", () => {
    expect(computeCompleteness({ pass: 5, fail: 2, na: 3, needsReview: 0 })).toBe(1);
  });

  it("returns null when there are no criteria", () => {
    expect(computeCompleteness({ pass: 0, fail: 0, na: 0, needsReview: 0 })).toBeNull();
  });

  it("is 0 when every criterion needs manual review", () => {
    expect(computeCompleteness({ pass: 0, fail: 0, na: 0, needsReview: 4 })).toBe(0);
  });
});

describe("wcagPrinciple / principleLabel", () => {
  it("maps a success criterion to its top-level principle number", () => {
    expect(wcagPrinciple("1.4.3")).toBe(1);
    expect(wcagPrinciple("2.1.1")).toBe(2);
    expect(wcagPrinciple("3.3.1")).toBe(3);
    expect(wcagPrinciple("4.1.2")).toBe(4);
  });

  it("labels the four principles in Italian", () => {
    expect(principleLabel(1)).toBe("Percepibile");
    expect(principleLabel(2)).toBe("Utilizzabile");
    expect(principleLabel(3)).toBe("Comprensibile");
    expect(principleLabel(4)).toBe("Robusto");
  });
});

describe("groupCriteriaByPrinciple", () => {
  it("groups rows under their principle, ordered 1→4, dropping empty principles", () => {
    const rows = [
      { wcagSc: "2.1.1", en301549Clause: null, state: "FAIL" as const },
      { wcagSc: "1.4.3", en301549Clause: null, state: "PASS" as const },
      { wcagSc: "1.1.1", en301549Clause: null, state: "PASS" as const },
    ];
    const groups = groupCriteriaByPrinciple(rows);
    expect(groups.map((g) => g.principle)).toEqual([1, 2]);
    expect(groups[0]!.label).toBe("Percepibile");
    expect(groups[0]!.rows.map((r) => r.wcagSc)).toEqual(["1.1.1", "1.4.3"]);
    expect(groups[1]!.rows.map((r) => r.wcagSc)).toEqual(["2.1.1"]);
  });
});

describe("criterionStateTone", () => {
  it("maps each state to a visual tone", () => {
    expect(criterionStateTone("FAIL")).toBe("fail");
    expect(criterionStateTone("NEEDS_MANUAL_REVIEW")).toBe("warn");
    expect(criterionStateTone("PASS")).toBe("ok");
    expect(criterionStateTone("NOT_APPLICABLE")).toBe("muted");
  });
});

describe("safeExternalHref", () => {
  it("passes through http and https URLs", () => {
    expect(safeExternalHref("https://dequeuniversity.com/rules/axe/4.11/image-alt")).toBe(
      "https://dequeuniversity.com/rules/axe/4.11/image-alt",
    );
    expect(safeExternalHref("http://example.com")).toBe("http://example.com");
  });

  it("rejects dangerous schemes and malformed URLs", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,<script>1</script>")).toBeNull();
    expect(safeExternalHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeExternalHref("not a url")).toBeNull();
    expect(safeExternalHref(null)).toBeNull();
    expect(safeExternalHref(undefined)).toBeNull();
    expect(safeExternalHref("")).toBeNull();
  });
});
