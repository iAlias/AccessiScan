export interface ScanProgressInput {
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";
  phase: string | null;
  pagesFound: number;
  pagesScanned: number;
}

export type ProgressStep = 1 | 2 | 3;

export interface ProgressView {
  /** 1 = starting/queued, 2 = crawling, 3 = scanning. Drives the stepper. */
  step: ProgressStep;
  title: string;
  /** Crawl + queue have no known total → animate an indeterminate bar instead of a stuck 0%. */
  indeterminate: boolean;
  /** Determinate percentage (0..100) for the scan phase, else null. */
  pct: number | null;
  /** Secondary line: "12 pagine trovate" / "34/120 pagine". */
  detail: string;
}

/**
 * Maps raw scan status to what the progress UI should show. Crucially, the crawl
 * phase (where pagesScanned is still 0) reads as live activity — "N pagine trovate"
 * with an indeterminate bar — rather than a frozen 0/0.
 */
export function progressView(s: ScanProgressInput): ProgressView {
  if (s.status === "QUEUED" || (!s.phase && s.pagesFound === 0 && s.pagesScanned === 0)) {
    return { step: 1, title: "Avvio della scansione", indeterminate: true, pct: null, detail: "In coda…" };
  }
  if (s.phase === "scan") {
    const total = s.pagesFound || 0;
    const done = s.pagesScanned || 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return {
      step: 3,
      title: "Scansione delle pagine",
      indeterminate: false,
      pct,
      detail: total > 0 ? `${done}/${total} pagine` : `${done} pagine`,
    };
  }
  // crawl (or any non-scan phase): discovery is open-ended
  return {
    step: 2,
    title: "Esplorazione del sito",
    indeterminate: true,
    pct: null,
    detail: s.pagesFound > 0 ? `${s.pagesFound} ${s.pagesFound === 1 ? "pagina trovata" : "pagine trovate"}` : "ricerca delle pagine…",
  };
}

/** "0:07", "1:23", "12:05" from a whole number of seconds. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

/**
 * A scan is "possibly stalled" when it is still running but nothing has advanced
 * (pages/currentUrl) for longer than the threshold. Lets the UI reassure or warn
 * instead of leaving the user guessing whether it hung.
 */
export function isStalled(msSinceLastChange: number, thresholdMs = 30_000): boolean {
  return msSinceLastChange >= thresholdMs;
}
