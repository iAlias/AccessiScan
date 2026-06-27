# Piano — Doppia vista report + Developer code-annotation (spunti MAUVE++)

Ispirato a [MAUVE++](https://mauve.isti.cnr.it/) (HIIS Lab, ISTI-CNR). Trasforma il report a vista
singola in tab multi-stakeholder, aggiunge la metrica di completezza e la categoria "Non applicabile".

## Stato dati di partenza (verificato)
- `Issue` ha già: `ruleId`, `wcagSc`, `en301549Clause`, `impact`, `help`, `helpUrl`, `htmlSnippet`,
  `targetSelector`, `failureSummary`, `occurrenceCount`. **Manca** sorgente pagina completo / numero riga.
- `Page` ha `url`, nessun HTML salvato.
- `CriterionState` enum ha **già** `PASS | FAIL | NEEDS_MANUAL_REVIEW | NOT_APPLICABLE`.
- `apps/web/src/app/scans/[id]/page.tsx` calcola già fail/manual/pass, **non** N/A né completezza.

Conseguenza: Fasi 0–2 **senza migrazioni DB**.

## Fase 0 — Quick wins
**0a. Completezza valutazione %**
- `packages/db`: nel core report aggiungi `completeness = (PASS+FAIL+NOT_APPLICABLE) / totaleCriteri`
  (quota valutata con certezza vs `NEEDS_MANUAL_REVIEW`).
- `apps/web/src/components/ReportKpis.tsx`: secondo donut (Accessibilità % | Completezza %).

**0b. Categoria "Non applicabile"**
- `page.tsx`: aggiungi `naCount = criteria.filter(c => c.state === "NOT_APPLICABLE").length`.
- `ReportKpis` + `CriterionList`: 5ª categoria con badge N/A.

## Fase 1 — Struttura a viste (Tabs)
Nuovo `apps/web/src/components/ReportViews.tsx` (client, `role="tablist"` accessibile):
- **Riepilogo** (default): KPI + IssueSummary + Comparison (contenuto attuale).
- **Utente finale**: linguaggio non-tecnico, criteri per principio WCAG (Percepibile/Utilizzabile/
  Comprensibile/Robusto), niente selettori/codice.
- **Sviluppatore**: Fase 2.

`page.tsx` resta server component, passa i dati pre-caricati ai tab (no refetch).

## Fase 2 — Vista Sviluppatore (annotazioni codice per occorrenza)
Senza sorgente intero → scheda per occorrenza:
- Repo `getIssuesWithSnippets(scanId)` in `packages/db`.
- `IssueCodeCard.tsx`: `htmlSnippet` in `<pre><code>` con elemento evidenziato; badge `ruleId` ·
  `wcagSc` · `en301549Clause` · livello · impact; `targetSelector` copiabile; `failureSummary` + link
  `helpUrl`. Raggruppato per `Page.url`, espandibile.

**Futuro (fuori scope):** salvare `Page.htmlSource` durante scan → vera vista MAUVE "sorgente con
numeri di riga + warning inline". Costo storage su 500 pagine → compressione/sampling da valutare.

## Ordine
0a+0b → Fase 1 scaffold tab → Fase 2 vista dev. Ogni fase mergeabile da sola.

## File
- `packages/db/src/repositories/*` (completeness, getIssuesWithSnippets)
- `apps/web/src/app/scans/[id]/page.tsx`
- `apps/web/src/components/`: `ReportKpis`, nuovo `ReportViews`, `IssueCodeCard`, `EndUserView`
- Test: `packages/db/tests/` (completeness + conteggi N/A)

Nessuna migrazione DB nelle Fasi 0–2.
