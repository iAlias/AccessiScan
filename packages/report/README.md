# @accessscan/report

On-demand report generation from a single `ReportModel`.

- `buildReportModel(scanId)` → normalized data (criteria, issues, diff, coverage, pinned versions).
- `renderVpatHtml(model)` → VPAT 2.5 EU HTML; `renderPdf(html)` → tagged A4 PDF (Playwright).
- `toCsv(model)` / `toJson(model)` → data exports.
- `draftStatement(input)` → conservative accessibility-statement draft (never CONFORME).
- `validatePdf(buf)` → veraPDF result, or `null` when `VERAPDF_PATH` is unset (skip).

veraPDF gate: set `VERAPDF_PATH` to the veraPDF CLI in CI to enforce PDF/UA-1 validity.

Reports are generated on demand (no file storage); only a `Report` metadata row is persisted.
Generation runs Chromium in-process via the scanner's shared browser; production should move
this to a dedicated Chromium service.

## Known limitation — `next build`

`pnpm --filter @accessscan/web build` currently fails: `vpat-template.tsx` imports
`react-dom/server`, and the App-Router export route pulls this package into Next's server
bundle graph, which Next 15 rejects. This is the spec §2 boundary (PDF/Chromium generation
does not belong in the Next process). **`next dev` works** — the report routes execute
in-process in dev, so the feature is fully usable locally and is covered by the test suite
(155 unit + 21 browser, incl. the VPAT axe dogfooding gate). The production fix is to give
this package a compiled `dist` output and run the render/PDF surface as a dedicated service
(deferred). Do NOT "fix" the build by adding `@accessscan/report` to `serverExternalPackages`:
the package's `main` is TypeScript source, so externalizing it trades the build error for a
runtime crash.

Manual E2E: open a scan report in the dashboard → Esporta PDF/CSV/JSON; open
`/domains/[id]/statement` → review the draft → save.
