# AccessiScan

> A standalone web accessibility auditing platform. Point it at a domain, let it crawl and scan every page, and get a detailed accessibility report with a compliance score, WCAG 2.1 AA / EN 301 549 verdict, and full scan history over time.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node ≥ 20](https://img.shields.io/badge/Node-%3E%3D20-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange.svg)](https://pnpm.io)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)

---

## Table of Contents

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
| **Verdict** | `CONFORME` · `PARZIALMENTE` · `NON_CONFORME` · `NON_DETERMINABILE` derived from blocking violations and manual-review coverage |
| **Issue Tracking** | Per-issue status (`OPEN`, `FIXED`, `IGNORED`, `SNOOZED`), assignee, HTML snippet, CSS selector, failure summary |
| **Scan Diff** | New / fixed / persistent issue sets compared across consecutive scans |
| **History** | Per-domain score history stored on every scan; trend charts ready |
| **Authenticated Scanning** | Login recipe (step-by-step Playwright actions) + encrypted credential vault (AES-GCM, per-domain DEK) |
| **Scheduled Scans** | Cron-based recurring scans per domain |
| **Reports** | Export in PDF, CSV, or JSON; optional veraPDF validation for PDF/UA |
| **Accessibility Statements** | Generate and store conformance statements per domain |
| **Multi-user** | Projects → Domains model with `ADMIN` / `MEMBER` roles |

---

## Architecture

AccessiScan is a **pnpm monorepo** composed of one application and three shared packages:

```
accessscan/
├── apps/
│   └── web/                  # Next.js 15 web application (App Router)
└── packages/
    ├── scanner/              # Core scan engine (Playwright + axe-core)
    ├── db/                   # Prisma schema, migrations, client helpers
    └── validation/           # Shared Zod validation schemas
```

The web app exposes the UI and API routes; the scanner package is imported directly and runs in the same Node.js process (or can be moved to a worker queue).

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

### 5. Install Playwright browser

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

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `******localhost:5432/accessscan` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `AUTH_SECRET` | NextAuth secret (≥ 32 random bytes) | `openssl rand -base64 32` |
| `VAULT_MASTER_KEY` | Master key for the credential vault, base64-encoded 32 bytes | `openssl rand -base64 32` |

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
| `pnpm test:browser` | Run browser tests |
| `pnpm test:all` | Run both test suites |
| `pnpm test:watch` | Watch mode |

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
├── robots.ts               # robots.txt parser
├── playwright-adapter.ts   # Playwright page fetcher
├── scanner.ts              # Per-page axe-core runner
├── run-scan.ts             # Full scan orchestration
├── scoring.ts              # 0–100 weighted score
├── verdict.ts              # Compliance verdict derivation
├── scan-diff.ts            # Diff between consecutive scans
├── scan-analysis.ts        # Criterion-level aggregation
├── wcag-catalog.ts         # WCAG 2.1 A/AA criterion catalog
└── sc-mapping.ts           # axe rule → WCAG SC mapping

packages/db/
└── prisma/
    ├── schema.prisma       # Full data model
    └── seed.ts             # Seed script
```

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
