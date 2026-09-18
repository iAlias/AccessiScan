# AccessiScan

**A standalone web accessibility auditing platform: point it at a domain, let it crawl and scan every page, and get a detailed accessibility report with a compliance score, a WCAG 2.1 AA / EN 301 549 verdict, and full scan history over time.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange.svg)](https://pnpm.io)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)

🇮🇹 [Leggi in italiano](README.it.md)

> **Part of a small web-compliance toolkit.** AccessiScan tells you *what* is wrong with a
> site; pair it with [**OpenConsent**](https://github.com/iAlias/OpenConsent) — a lightweight,
> dependency-free GDPR consent banner with Google Consent Mode v2 — to fix the consent side of
> the same audit.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Category | Details |
|---|---|
| **Crawling** | BFS crawler + sitemap.xml discovery, robots.txt compliance, configurable depth & page limit, polite delay between requests |
| **Auditing** | Headless Chromium via Playwright, axe-core rules engine, WCAG 2.1 A/AA criteria mapped to EN 301 549 clauses |
| **Scoring** | Weighted 0–100 score (critical 10 pts, serious 6, moderate 3, minor 1) aggregated across all scanned pages |
| **Verdict** | `CONFORME` · `PARZIALMENTE` · `NON_CONFORME` · `NON_DETERMINABILE`, derived from blocking violations and manual-review coverage |
| **AI-assisted manual review** | An optional LLM pass (Anthropic or an OpenAI-compatible provider) evaluates the WCAG success criteria axe-core cannot automate — reading order, focus behavior, error messages, consistent navigation, and more — clustering pages and flagging suggestions above a confidence threshold for human sign-off |
| **Issue tracking** | Per-issue status (`OPEN`, `FIXED`, `IGNORED`, `SNOOZED`), assignee, HTML snippet, CSS selector, failure summary |
| **Scan diff** | New / fixed / persistent issue sets compared across consecutive scans |
| **History** | Per-domain score history stored on every scan; trend charts ready |
| **Authenticated scanning** | Login recipe (step-by-step Playwright actions) + encrypted credential vault (AES-GCM, per-domain DEK) |
| **Scheduled scans** | Cron-based recurring scans per domain |
| **Reports** | Export as PDF, CSV, or JSON; optional veraPDF validation for PDF/UA |
| **Accessibility statements** | Generate and store conformance statements per domain |
| **Multi-user** | Projects → Domains model with `ADMIN` / `MEMBER` roles |

> [!IMPORTANT]
> A `CONFORME` verdict is reachable **only** through the manual-review wizard, where a human
> signs off on every non-automatable criterion. Automated scans alone never emit `CONFORME` —
> at most `PARZIALMENTE`, `NON_CONFORME`, or `NON_DETERMINABILE`. This is a deliberate product
> invariant, not a limitation to work around.

---

## Architecture

AccessiScan is a **pnpm monorepo** composed of one application and five shared packages:

```
AccessiScan/
├── apps/
│   └── web/                  # Next.js 15 web application (App Router)
└── packages/
    ├── scanner/               # Core scan engine (Playwright + axe-core)
    ├── ai-review/              # Optional LLM-assisted manual-criteria review
    ├── report/                 # VPAT/PDF/CSV/JSON report generation
    ├── db/                     # Prisma schema, migrations, client helpers
    └── validation/             # Shared Zod validation schemas
```

The web app exposes the UI and API routes; `scanner`, `ai-review` and `report` are imported directly and run in the same Node.js process (they can be moved to a worker queue for higher throughput).

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** 9 (`npm i -g pnpm@9`)
- **Docker** (for the bundled PostgreSQL + Redis via Compose)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/iAlias/AccessiScan.git
cd AccessiScan
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d        # starts postgres:16 and redis:7
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — see Environment Variables below
```

### 4. Run database migrations and seed

```bash
pnpm db:migrate             # applies all Prisma migrations
pnpm db:seed                # seeds initial data (optional)
```

### 5. Install the Playwright browser

```bash
pnpm --filter @accessscan/scanner pw:install
```

### 6. Start the dev server

```bash
pnpm --filter @accessscan/web dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

### Required

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://accessscan:accessscan@localhost:5432/accessscan?schema=public` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `AUTH_SECRET` | NextAuth secret (≥ 32 random bytes) | `openssl rand -base64 32` |
| `VAULT_MASTER_KEY` | Master key for the credential vault; must base64-decode to exactly 32 bytes | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

### Optional — AI-assisted review (`packages/ai-review`)

| Variable | Description | Default |
|---|---|---|
| `AI_PROVIDER` | `anthropic` or an OpenAI-compatible provider | `anthropic` |
| `AI_MODEL` | Model name | `claude-sonnet-4-6` (Anthropic) |
| `AI_API_KEY` | API key for the selected provider | — |
| `AI_BASE_URL` | Override the provider's base URL (self-hosted / proxy) | provider default |
| `AI_CONFIDENCE_THRESHOLD` | Minimum confidence (0–1) for a suggestion to surface | `0.7` |

### Optional — report validation (`packages/report`)

| Variable | Description |
|---|---|
| `VERAPDF_PATH` | Path to the veraPDF CLI; when set, generated PDFs are validated for PDF/UA-1 conformance in CI. When unset, validation is skipped. |

---

## Available Scripts

All commands are run from the **repository root**.

| Command | Description |
|---|---|
| `pnpm --filter @accessscan/web dev` | Start the Next.js dev server |
| `pnpm --filter @accessscan/web build` | Production build |
| `pnpm db:generate` | Regenerate the Prisma client after schema changes |
| `pnpm db:migrate` | Create and apply a new migration (dev) |
| `pnpm db:migrate:test` | Apply migrations against the test database |
| `pnpm db:seed` | Seed the database |
| `pnpm test` | Run all unit/integration tests with Vitest |
| `pnpm test:browser` | Run browser tests (includes the accessibility "dogfooding" gate) |
| `pnpm test:all` | Run both test suites |
| `pnpm test:watch` | Watch mode |

> [!NOTE]
> `pnpm test:browser` renders the dashboard's own presentational components and full-page
> compositions to static HTML and scans them with axe (`wcag2a`/`2aa`/`21a`/`21aa`/`EN-301-549`)
> — zero violations required. AccessiScan is expected to pass its own audit.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Web framework** | [Next.js 15](https://nextjs.org) (App Router) · React 19 |
| **Authentication** | [NextAuth v5](https://authjs.dev) (credentials provider) |
| **Database** | PostgreSQL 16 via [Prisma ORM](https://www.prisma.io) |
| **Cache / Queue** | Redis 7 |
| **Scanner** | [Playwright](https://playwright.dev) 1.61 (headless Chromium) |
| **Accessibility engine** | [axe-core](https://github.com/dequelabs/axe-core) 4.11 via `@axe-core/playwright` |
| **AI review** | Anthropic / OpenAI-compatible LLM APIs |
| **Report validation** | veraPDF (optional, for PDF/UA) |
| **Validation** | [Zod](https://zod.dev) |
| **Testing** | [Vitest](https://vitest.dev) |
| **Language** | TypeScript 5 |
| **Package manager** | pnpm 9 (workspaces) |

---

## Project Structure

```
apps/web/src/
├── app/
│   ├── (auth)/             # Sign-in / sign-up routes
│   ├── api/                # API route handlers
│   └── projects/           # Project & scan UI pages
├── lib/                    # Server-side helpers, auth config
└── types/                  # Shared TypeScript types

packages/scanner/src/
├── crawl.ts                # BFS crawler
├── sitemap.ts              # Sitemap.xml parser
├── robots.ts                # robots.txt parser
├── playwright-adapter.ts    # Playwright page fetcher
├── scanner.ts               # Per-page axe-core runner
├── run-scan.ts               # Full scan orchestration
├── scoring.ts                # 0–100 weighted score
├── verdict.ts                # Compliance verdict derivation
├── scan-diff.ts               # Diff between consecutive scans
├── scan-analysis.ts           # Criterion-level aggregation
├── wcag-catalog.ts             # WCAG 2.1 A/AA criterion catalog
└── sc-mapping.ts                # axe rule → WCAG SC mapping

packages/ai-review/src/
├── criteria.ts              # Non-automatable WCAG criteria rubrics
├── capture.ts                # Page context capture for the LLM
├── cluster.ts                 # Groups similar pages before evaluation
├── evaluate.ts                 # Runs the LLM evaluation pass
├── aggregate.ts                 # Aggregates per-page results
├── provider*.ts                  # Anthropic / OpenAI-compatible provider adapters
└── run-for-scan.ts                # Production entry point wired to the DB and scanner

packages/report/src/
├── (report model, VPAT HTML, PDF, CSV/JSON exports — see packages/report/README.md)

packages/db/
└── prisma/
    ├── schema.prisma       # Full data model
    └── seed.ts             # Seed script
```

For manual QA and package-level implementation notes, see `apps/web/README-dashboard.md` and `packages/report/README.md`.

---

## Contributing

Contributions are welcome! Please open an issue before submitting a pull request so we can discuss the change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org)
4. Open a pull request against `main`

---

## License

Distributed under the [MIT License](LICENSE). © 2026 Antonio.
