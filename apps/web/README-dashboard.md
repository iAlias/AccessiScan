# AccessScan Dashboard — manual E2E & verification

## Automated checks
- `pnpm test` — unit suite (repo queries, format helpers, scan-poll, API handlers).
- `pnpm test:browser` — AA gate: presentational components and full-page compositions are rendered to static HTML and scanned with axe (`wcag2a/2aa/21a/21aa/EN-301-549`); zero violations required. Plus the scanner browser tests.
- `pnpm exec tsc -p apps/web/tsconfig.json --noEmit` and `... packages/db/...` — typecheck.
- `pnpm --filter @accessscan/web build` — compiles the RSC pages.

## Manual E2E (run once before merge)
1. Ensure Postgres is running and migrations are applied: `pnpm db:migrate`.
2. Seed demo data: create a user, a project, a domain, and at least one DONE scan.
   The simplest path is to run a real scan against a fixture or insert via Prisma Studio
   (`pnpm --filter @accessscan/db exec prisma studio`). You need: 1 User, 1 Project,
   1 Domain, 1 Scan (status DONE, with score/verdict/coverageRatio), some Pages+Issues,
   50 CriterionResult rows, and a ScoreHistory row or two for the trend.
3. `pnpm --filter @accessscan/web dev` → open http://localhost:3000 → log in.
4. Land on `/` (Panoramica): verify each domain card shows the score ring, verdict pill,
   trend sparkline (or "Nessuno storico"), last-scan meta, and an "Avvia scansione" button.
5. Click "Avvia scansione": the `aria-live` region announces "In coda"/"In corso";
   when the scan reaches DONE the card refreshes automatically (`router.refresh`).
6. Click a domain title → `/domains/[id]`: scan history list; click "Apri report" on a DONE
   scan → `/scans/[id]`.
7. On the report: confirm the score/verdict header, the diff counts, the 50-criteria table,
   and per-page issue groups expand/collapse (keyboard: Tab to the toggle, Enter/Space).
8. Run an axe or Lighthouse pass on each page in the browser → expect no WCAG AA violations
   (the dashboard dogfoods its own scanner).

## Revisione manuale (sblocca CONFORME)
1. Login come utente ADMIN (role=ADMIN).
2. Apri un report scan DONE → "Avvia revisione manuale" → /scans/[id]/review.
3. Per ogni step (8 procedure §4.4 + Criteri residui) marca i criteri pendenti Pass/Fail con nota.
4. Quando 0 pendenti e 0 fail → il banner mostra "Conforme sbloccato".
5. Un Fail su un criterio → NON_CONFORME. Ricarica → stato persistito (source MANUAL, nota).

Verdetto: CONFORME è raggiungibile SOLO da questo wizard (sign-off umano di tutti i criteri),
mai da uno scan automatico. Ogni decisione è tracciata (reviewerId, reviewedAt, source MANUAL, nota).

## Notes
- Automated scans never emit a "Conforme" verdict (hard product invariant); expect
  NON_CONFORME / PARZIALMENTE / NON_DETERMINABILE.
- Config UI (login recipes, credentials, crawl config) is intentionally out of scope for
  this plan and will be added later; auth-scan can still be exercised via the API/seed.
