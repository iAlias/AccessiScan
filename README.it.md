# AccessiScan

**Una piattaforma standalone di audit sull'accessibilità web: puntala su un dominio, lasciala effettuare la scansione di ogni pagina, e ottieni un report dettagliato con punteggio di conformità, verdetto WCAG 2.1 AA / EN 301 549 e storico completo delle scansioni nel tempo.**

[![Licenza](https://img.shields.io/badge/licenza-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange.svg)](https://pnpm.io)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)

🇬🇧 [Read in English](README.md)

> **Parte di un piccolo toolkit per la compliance web.** AccessiScan ti dice *cosa* non va bene
> in un sito; abbinalo a [**OpenConsent**](https://github.com/iAlias/OpenConsent) — un banner
> di consenso GDPR leggero e senza dipendenze, con Google Consent Mode v2 — per sistemare anche
> il lato consenso dello stesso audit.

---

## Indice

- [Caratteristiche](#caratteristiche)
- [Architettura](#architettura)
- [Prerequisiti](#prerequisiti)
- [Per iniziare](#per-iniziare)
- [Variabili d'ambiente](#variabili-dambiente)
- [Script disponibili](#script-disponibili)
- [Stack tecnologico](#stack-tecnologico)
- [Struttura del progetto](#struttura-del-progetto)
- [Contribuire](#contribuire)
- [Licenza](#licenza)

---

## Caratteristiche

| Categoria | Dettagli |
|---|---|
| **Crawling** | Crawler BFS + scoperta tramite sitemap.xml, rispetto del robots.txt, profondità e limite pagine configurabili, ritardo educato tra le richieste |
| **Audit** | Chromium headless via Playwright, motore di regole axe-core, criteri WCAG 2.1 A/AA mappati sulle clausole EN 301 549 |
| **Punteggio** | Score pesato 0–100 (critico 10 pt, serio 6, moderato 3, minore 1) aggregato su tutte le pagine scansionate |
| **Verdetto** | `CONFORME` · `PARZIALMENTE` · `NON_CONFORME` · `NON_DETERMINABILE`, derivato dalle violazioni bloccanti e dalla copertura della revisione manuale |
| **Revisione manuale assistita da AI** | Un passaggio LLM opzionale (Anthropic o un provider compatibile OpenAI) valuta i criteri WCAG che axe-core non può automatizzare — ordine di lettura, comportamento del focus, messaggi di errore, navigazione coerente e altro — raggruppando le pagine e segnalando suggerimenti sopra una soglia di confidenza, per la firma finale di un umano |
| **Gestione issue** | Stato per singola issue (`OPEN`, `FIXED`, `IGNORED`, `SNOOZED`), assegnatario, snippet HTML, selettore CSS, riepilogo del fallimento |
| **Diff tra scansioni** | Insiemi di issue nuove / risolte / persistenti confrontati tra scansioni consecutive |
| **Storico** | Storico del punteggio per dominio salvato ad ogni scansione; grafici di trend pronti |
| **Scansione autenticata** | Ricetta di login (azioni Playwright passo-passo) + vault credenziali cifrato (AES-GCM, DEK per dominio) |
| **Scansioni pianificate** | Scansioni ricorrenti per dominio basate su cron |
| **Report** | Esportazione in PDF, CSV o JSON; validazione veraPDF opzionale per PDF/UA |
| **Dichiarazioni di accessibilità** | Generazione e archiviazione di dichiarazioni di conformità per dominio |
| **Multi-utente** | Modello Progetti → Domini con ruoli `ADMIN` / `MEMBER` |

> [!IMPORTANT]
> Un verdetto `CONFORME` è raggiungibile **solo** tramite la procedura guidata di revisione
> manuale, dove un umano firma ogni criterio non automatizzabile. Le scansioni automatiche da
> sole non emettono mai `CONFORME` — al massimo `PARZIALMENTE`, `NON_CONFORME` o
> `NON_DETERMINABILE`. È un invariante di prodotto deliberato, non un limite da aggirare.

---

## Architettura

AccessiScan è un **monorepo pnpm** composto da un'applicazione e cinque package condivisi:

```
AccessiScan/
├── apps/
│   └── web/                  # Applicazione web Next.js 15 (App Router)
└── packages/
    ├── scanner/               # Motore di scansione principale (Playwright + axe-core)
    ├── ai-review/              # Revisione opzionale assistita da LLM dei criteri manuali
    ├── report/                 # Generazione report VPAT/PDF/CSV/JSON
    ├── db/                     # Schema Prisma, migrazioni, helper client
    └── validation/             # Schemi di validazione Zod condivisi
```

L'app web espone la UI e le route API; `scanner`, `ai-review` e `report` vengono importati direttamente e girano nello stesso processo Node.js (possono essere spostati su una coda worker per un throughput maggiore).

---

## Prerequisiti

- **Node.js** ≥ 20
- **pnpm** 9 (`npm i -g pnpm@9`)
- **Docker** (per PostgreSQL + Redis via Compose)

---

## Per iniziare

### 1. Clona e installa

```bash
git clone https://github.com/iAlias/AccessiScan.git
cd AccessiScan
pnpm install
```

### 2. Avvia l'infrastruttura

```bash
docker compose up -d        # avvia postgres:16 e redis:7
```

### 3. Configura l'ambiente

```bash
cp .env.example .env
# Modifica .env — vedi Variabili d'ambiente qui sotto
```

### 4. Esegui le migrazioni del database e il seed

```bash
pnpm db:migrate             # applica tutte le migrazioni Prisma
pnpm db:seed                # popola dati iniziali (opzionale)
```

### 5. Installa il browser Playwright

```bash
pnpm --filter @accessscan/scanner pw:install
```

### 6. Avvia il server di sviluppo

```bash
pnpm --filter @accessscan/web dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## Variabili d'ambiente

Copia `.env.example` in `.env` e compila i valori.

### Obbligatorie

| Variabile | Descrizione | Esempio |
|---|---|---|
| `DATABASE_URL` | Stringa di connessione PostgreSQL | `postgresql://accessscan:accessscan@localhost:5432/accessscan?schema=public` |
| `REDIS_URL` | Stringa di connessione Redis | `redis://localhost:6379` |
| `AUTH_SECRET` | Secret di NextAuth (≥ 32 byte casuali) | `openssl rand -base64 32` |
| `VAULT_MASTER_KEY` | Chiave master per il vault delle credenziali; deve decodificare in base64 esattamente 32 byte | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

### Opzionali — revisione assistita da AI (`packages/ai-review`)

| Variabile | Descrizione | Default |
|---|---|---|
| `AI_PROVIDER` | `anthropic` oppure un provider compatibile OpenAI | `anthropic` |
| `AI_MODEL` | Nome del modello | `claude-sonnet-4-6` (Anthropic) |
| `AI_API_KEY` | Chiave API per il provider selezionato | — |
| `AI_BASE_URL` | Sovrascrive la base URL del provider (self-hosted / proxy) | default del provider |
| `AI_CONFIDENCE_THRESHOLD` | Confidenza minima (0-1) perché un suggerimento venga mostrato | `0.7` |

### Opzionali — validazione report (`packages/report`)

| Variabile | Descrizione |
|---|---|
| `VERAPDF_PATH` | Percorso del CLI veraPDF; se impostato, i PDF generati vengono validati per la conformità PDF/UA-1 in CI. Se non impostato, la validazione viene saltata. |

---

## Script disponibili

Tutti i comandi vanno eseguiti dalla **radice del repository**.

| Comando | Descrizione |
|---|---|
| `pnpm --filter @accessscan/web dev` | Avvia il server di sviluppo Next.js |
| `pnpm --filter @accessscan/web build` | Build di produzione |
| `pnpm db:generate` | Rigenera il client Prisma dopo modifiche allo schema |
| `pnpm db:migrate` | Crea e applica una nuova migrazione (dev) |
| `pnpm db:migrate:test` | Applica le migrazioni sul database di test |
| `pnpm db:seed` | Popola il database |
| `pnpm test` | Esegue tutti i test unitari/di integrazione con Vitest |
| `pnpm test:browser` | Esegue i test browser (include il gate di accessibilità "dogfooding") |
| `pnpm test:all` | Esegue entrambe le suite di test |
| `pnpm test:watch` | Modalità watch |

> [!NOTE]
> `pnpm test:browser` renderizza i componenti presentazionali e le composizioni di pagina
> intera della dashboard in HTML statico e li scansiona con axe (`wcag2a`/`2aa`/`21a`/`21aa`/
> `EN-301-549`) — richiede zero violazioni. AccessiScan deve superare il proprio stesso audit.

---

## Stack tecnologico

| Livello | Tecnologia |
|---|---|
| **Framework web** | [Next.js 15](https://nextjs.org) (App Router) · React 19 |
| **Autenticazione** | [NextAuth v5](https://authjs.dev) (provider a credenziali) |
| **Database** | PostgreSQL 16 via [Prisma ORM](https://www.prisma.io) |
| **Cache / Coda** | Redis 7 |
| **Scanner** | [Playwright](https://playwright.dev) 1.61 (Chromium headless) |
| **Motore accessibilità** | [axe-core](https://github.com/dequelabs/axe-core) 4.11 via `@axe-core/playwright` |
| **Revisione AI** | API LLM Anthropic / compatibili OpenAI |
| **Validazione report** | veraPDF (opzionale, per PDF/UA) |
| **Validazione** | [Zod](https://zod.dev) |
| **Test** | [Vitest](https://vitest.dev) |
| **Linguaggio** | TypeScript 5 |
| **Package manager** | pnpm 9 (workspaces) |

---

## Struttura del progetto

```
apps/web/src/
├── app/
│   ├── (auth)/             # Route di accesso / registrazione
│   ├── api/                # Handler delle route API
│   └── projects/           # Pagine UI di progetti e scansioni
├── lib/                    # Helper lato server, configurazione auth
└── types/                  # Tipi TypeScript condivisi

packages/scanner/src/
├── crawl.ts                # Crawler BFS
├── sitemap.ts              # Parser sitemap.xml
├── robots.ts                # Parser robots.txt
├── playwright-adapter.ts    # Fetcher di pagina via Playwright
├── scanner.ts               # Esecutore axe-core per pagina
├── run-scan.ts               # Orchestrazione completa della scansione
├── scoring.ts                # Punteggio pesato 0–100
├── verdict.ts                # Derivazione del verdetto di conformità
├── scan-diff.ts               # Diff tra scansioni consecutive
├── scan-analysis.ts           # Aggregazione a livello di criterio
├── wcag-catalog.ts             # Catalogo dei criteri WCAG 2.1 A/AA
└── sc-mapping.ts                # Mappatura regola axe → criterio WCAG

packages/ai-review/src/
├── criteria.ts              # Rubriche dei criteri WCAG non automatizzabili
├── capture.ts                # Cattura del contesto di pagina per l'LLM
├── cluster.ts                 # Raggruppa pagine simili prima della valutazione
├── evaluate.ts                 # Esegue il passaggio di valutazione LLM
├── aggregate.ts                 # Aggrega i risultati per pagina
├── provider*.ts                  # Adapter provider Anthropic / compatibili OpenAI
└── run-for-scan.ts                # Punto di ingresso in produzione collegato a DB e scanner

packages/report/src/
├── (modello report, HTML VPAT, PDF, esportazioni CSV/JSON — vedi packages/report/README.md)

packages/db/
└── prisma/
    ├── schema.prisma       # Modello dati completo
    └── seed.ts             # Script di seed
```

Per il QA manuale e le note implementative a livello di package, vedi `apps/web/README-dashboard.md` e `packages/report/README.md`.

---

## Contribuire

I contributi sono benvenuti! Apri una issue prima di inviare una pull request, così possiamo discutere la modifica.

1. Fai un fork del repository
2. Crea un branch per la feature: `git checkout -b feat/your-feature`
3. Fai commit delle modifiche seguendo [Conventional Commits](https://www.conventionalcommits.org)
4. Apri una pull request verso `main`

---

## Licenza

Distribuito sotto [licenza MIT](LICENSE). © 2026 Antonio.
