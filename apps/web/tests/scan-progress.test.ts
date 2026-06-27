import { describe, it, expect } from "vitest";
import { progressView, formatElapsed, isStalled } from "../src/lib/scan-progress.js";

const base = { status: "RUNNING" as const, phase: null, pagesFound: 0, pagesScanned: 0 };

describe("progressView", () => {
  it("shows an indeterminate 'starting' state while queued", () => {
    const v = progressView({ ...base, status: "QUEUED" });
    expect(v.step).toBe(1);
    expect(v.indeterminate).toBe(true);
    expect(v.pct).toBeNull();
  });

  it("treats early running with no phase as starting", () => {
    expect(progressView({ ...base, phase: null }).step).toBe(1);
  });

  it("crawl reads as live discovery, not a frozen 0/0", () => {
    const v = progressView({ ...base, phase: "crawl", pagesFound: 12 });
    expect(v.step).toBe(2);
    expect(v.indeterminate).toBe(true);
    expect(v.pct).toBeNull();
    expect(v.detail).toBe("12 pagine trovate");
  });

  it("crawl singular/empty wording", () => {
    expect(progressView({ ...base, phase: "crawl", pagesFound: 1 }).detail).toBe("1 pagina trovata");
    expect(progressView({ ...base, phase: "crawl", pagesFound: 0 }).detail).toBe("ricerca delle pagine…");
  });

  it("scan is determinate with a percentage", () => {
    const v = progressView({ ...base, phase: "scan", pagesFound: 120, pagesScanned: 30 });
    expect(v.step).toBe(3);
    expect(v.indeterminate).toBe(false);
    expect(v.pct).toBe(25);
    expect(v.detail).toBe("30/120 pagine");
  });

  it("scan caps percentage at 100 and never divides by zero", () => {
    expect(progressView({ ...base, phase: "scan", pagesFound: 10, pagesScanned: 99 }).pct).toBe(100);
    expect(progressView({ ...base, phase: "scan", pagesFound: 0, pagesScanned: 0 }).pct).toBe(0);
  });
});

describe("formatElapsed", () => {
  it("formats seconds as m:ss", () => {
    expect(formatElapsed(7)).toBe("0:07");
    expect(formatElapsed(83)).toBe("1:23");
    expect(formatElapsed(725)).toBe("12:05");
    expect(formatElapsed(-5)).toBe("0:00");
  });
});

describe("isStalled", () => {
  it("flags inactivity past the threshold", () => {
    expect(isStalled(30_000)).toBe(true);
    expect(isStalled(29_999)).toBe(false);
    expect(isStalled(45_000, 60_000)).toBe(false);
  });
});
