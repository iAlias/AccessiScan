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

Manual E2E: open a scan report in the dashboard → Esporta PDF/CSV/JSON; open
`/domains/[id]/statement` → review the draft → save.
