# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MeshOS is an executive-function support app built for people who struggle with task initiation, sequencing, and transitions. It is not a productivity app — the goal is daily stability, not output-maxing. The core product centers on chain-first daily planning around real anchors and constraints.

**Stack:** Astro (SSR, Vercel adapter) + React + TypeScript + Tailwind CSS, backed by Supabase (PostgreSQL + RLS). Deployed on Vercel.

## Common Commands

- `npm run dev` — Start Astro dev server (localhost:4321)
- `npm run build` — Production build
- `npm run format` — Prettier format all files
- `npm run format:check` — Check formatting without writing
- `npm test` — Run all tests (Vitest, single run)
- `npm run test:watch` — Run tests in watch mode
- `npm run test:habits:unit` — Run only habit/streak unit tests
- `npm run test:habits:all` — Run all habit tests (unit, integration, e2e, performance)
- `vitest --run path/to/file.test.ts` — Run a single test file
- `npm run db:reset` — Reset local Supabase database
- `npm run db:generate-types` — Regenerate `src/types/supabase.ts` from Supabase schema (update project ID first)

## Architecture

### Rendering Model

Astro runs in full SSR mode (`output: 'server'`). Pages are `.astro` files that can embed React components with `client:load` or `client:idle` directives. API routes live under `src/pages/api/` as Astro API routes exporting `GET`/`POST`/etc.

### Path Aliases

Configured in `tsconfig.json` and `vitest.config.ts`:

- `@/*` → `./src/*` (primary alias used throughout)
- `components/*`, `lib/*`, `types/*` also map into `./src/`

### Authentication — Two Patterns

1. **Server-side (API routes and middleware):** `createServerAuth(cookies)` from `src/lib/auth/simple-multi-user.ts` returns a `ServerAuth` instance. Call `serverAuth.requireAuth()` to get the authenticated user or throw. Access `serverAuth.supabase` for a user-scoped Supabase client. This is the pattern used in all API routes.

2. **Client-side (React components):** `AuthProvider` in `src/lib/auth/context.tsx` wraps the app. Use `useAuth()` to access user, session, token balance, trial status, and auth actions.

`user_id` is always derived from the server session, never trusted from client payload.

### Middleware Flow (`src/middleware.ts`)

Every request goes through middleware that:

1. Classifies the route via `RouteClassifier` (static, public, protected)
2. Skips auth for static assets and public routes
3. For protected routes: checks Supabase auth → enforces onboarding completion → enforces billing/trial gate → allows access

### Core Domain: Chain-Based Execution Engine

This is the most complex subsystem. The mental model:

**Anchors** → **Chains** → **Commitment Envelopes** → **Time Blocks**

- **Anchors** (`src/lib/anchors/`): Fixed external commitments (class, appointment, etc.) extracted from calendar events or manually added. Classified by type: `class | seminar | workshop | appointment | other`.

- **Chains** (`src/lib/chains/`): Execution chains generated backward from anchor start time. Each chain contains a **commitment envelope** with five steps: `prep → travel_there → anchor → travel_back → recovery`. The `ChainGenerator` orchestrates this, incorporating travel duration, chain templates per anchor type, energy level, and daily context.

- **Exit Gate** (`src/lib/chains/exit-gate.ts`): A boolean checklist (keys, phone, meds, bag, etc.) that must be satisfied before the user leaves for an anchor.

- **Wake Ramp** (`src/lib/chains/wake-ramp.ts`): Mandatory startup sequence after waking. Duration varies by energy level (75–120 min). Skipped if plan starts 2+ hours after wake time.

- **Daily Context** (`src/lib/context/daily-context.ts`): Aggregates yesterday's habit data (D-1, never same-day) into context that informs chain generation — substances, meds, hygiene, meals, energy flags, and duration priors.

- **Plan Builder** (`src/lib/daily-plan/plan-builder.ts`): Orchestrates plan generation. Takes wake/sleep time, energy state, and anchors, then produces time blocks including chains, wake ramp, and meal placements. Meal placement follows anchor-aware scheduling with 3-hour minimum gap and defined meal windows.

### Daily Plan API

`POST /api/daily-plan/generate` is the primary entry point. Requires `wakeTime`, `sleepTime`, `energyState`. If no calendar or manual anchors exist for the day, returns a `422` with `MANUAL_ANCHOR_REQUIRED`. Regeneration is idempotent — existing plans for the same user/day are replaced.

### Habits Module

- CRUD via `src/pages/api/habits/` endpoints
- Streak calculation in `src/lib/habits/streaks.ts`
- Habit note parsing via `src/lib/habits/note-parser.ts` (extracts structured data from free-text notes)
- Semantic classification via `src/lib/habits/taxonomy.ts`
- Import from Loop Habits CSV via `src/lib/import/enhanced-loop-habits-v2.ts` with dedup/merge logic
- Analytics dashboard with completion rates, heatmaps, streak timelines, cross-habit correlations

### Token/Billing System

Users start with a token balance (trial credits). Token operations go through `src/lib/tokens/service.ts` and `ServerAuth.deductTokens()`. The middleware checks `getBillingSnapshot()` from `src/lib/billing/subscription.ts` to gate access when trial expires or subscription lapses.

### Database

- Supabase PostgreSQL with RLS enabled on all user-facing tables
- Migrations in `supabase/migrations/` (sequential timestamp naming)
- Generated types in `src/types/supabase.ts`
- Key tables: `profiles`, `user_preferences`, `user_tokens`, `token_transactions`, `habits`, `habit_entries`, `daily_plans`, `time_blocks`, `exit_times`, `manual_anchors`, `calendar_events`, `calendar_sources`, `waitlist`

### Styling

Tailwind CSS with a custom dark theme using CSS custom properties (`--background`, `--surface`, `--text-primary`, `--accent-primary`, etc.) defined in `src/styles/messy-theme.css`. Semantic color tokens are mapped in `tailwind.config.mjs`. Use these semantic names (`bg-background`, `text-text-primary`, `border-border`, etc.) rather than raw Tailwind colors.

### Testing

Vitest with jsdom environment. Setup file at `src/test/setup.ts`. Tests are organized as:

- `src/test/unit/` — Unit tests
- `src/test/integration/` — Integration tests
- `src/test/e2e/` — End-to-end tests
- `src/test/performance/` — Performance tests

## Security Invariants

- All protected API routes must call `serverAuth.requireAuth()` and derive `user_id` from the returned user object
- All Supabase queries on user data must filter by `user_id`
- RLS is enabled — but application-level scoping is still required as defense-in-depth
- Onboarding and billing gates in middleware must not be bypassed in new routes unless explicitly exempt

## Current Focus

Active stabilization targets: Daily Plan (chain view, exit-gate flow, manual anchors), Habits (import, dedupe, logging, streaks), and Account/Settings. Modules like finance, health, and content exist in the schema but are out of scope for current reliability work.
