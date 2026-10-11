# MeshOS — Module Deep Dive (Written From Source)

> This was written by reading the actual code files, not the AI-generated docs.
> Last verified: May 2026.

---

## 1. Mirror — The Core Runtime View

### What it is

Mirror is the **live view of your day in progress**. Not the plan generator — that's a separate page (`/daily-plan`). Mirror is what you open *during* the day to see what's happening right now and what comes next. It reads the plan that was already generated, enriches it with real-time data, and shows you a filtered, context-aware version of your timeline.

The name "Mirror" comes from the idea that it reflects back your plan in real-time, adjusted for where you actually are. (You noted in `ideas.txt` that this name is bad — that's fair.)

### Files involved

| File | Role |
|---|---|
| `src/components/daily-plan/MirrorUI.tsx` | Root component — 1614 lines, orchestrates everything |
| `src/pages/api/daily-plan/mirror.ts` | `GET /api/daily-plan/mirror` — the API it fetches from |
| `src/components/daily-plan/Timeline.tsx` | Renders the actual time block list |
| `src/lib/triage/time-physics.ts` | Runway calculation |
| `src/lib/triage/triage-service.ts` | Decides if you're in danger of missing an anchor |
| `src/lib/triage/state-filter.ts` | Decides whether to show the state declaration prompt |
| `src/lib/display/display-mode-service.ts` | Filters time blocks by display mode |
| `src/lib/display/serializer.ts` | Persists display mode to sessionStorage |

### Data flow

```
User opens Mirror
  → MirrorUI mounts → calls GET /api/daily-plan/mirror
  → mirror.ts:
      1. Gets today's plan + time blocks from DB
      2. Runs attachTimingSignalsToTimeBlocks() → adds ready_to_leave_by, effective_arrival_deadline, etc.
      3. Runs TimePhysicsService.calculateRunway() → how many minutes until next anchor's effective deadline
      4. Runs TriageService.getTriageState() → are you going to miss it?
      5. Checks user_preferences.last_state_declaration → should we show the "how are you feeling" prompt?
      6. Returns: { time_blocks, timing_signals, runway, triage_state, show_state_prompt, last_state_declaration }
  → MirrorUI stores this in state
  → Renders: Header + prompts + Timeline
```

### The runway calculation (`time-physics.ts`)

This is the most important piece of logic in Mirror. It answers: **"how much time do you have before you need to leave?"**

```ts
// Runway = minutes until effective_arrival_deadline of next anchor
// (not anchor start — if max_late_minutes=5, deadline = anchor_start + 5min)

// Required duration = sum of remaining prep + travel_there blocks
// (only those two — not anchor, travel_back, or recovery)

// If runway < required_duration → triage activates
```

Key insight: it uses `effective_arrival_deadline` not `anchor_start`. So if you set a 5-minute grace window for an anchor, the runway calculation respects that.

### Triage (`triage-service.ts`)

Triage activates when `runway < required_duration`. When active, it identifies the **keystone** activity to protect:

- For `class` or `seminar` anchors → keystone is the anchor itself (just get there)
- For `appointment` anchors → if prep > 15min, keystone is prep; otherwise the anchor

Three options are presented:
1. **Protect Keystone** — strip everything except keystone + anchor
2. **Skip Anchor** — mark the anchor as skipped, remove from timeline
3. **Recalculate** — regenerate plan from current time

In V1: triage auto-shows when active. In V2 (currently behind `MIRROR_V2_ENABLED=false` flag): triage is only shown when manually triggered.

### Display modes (V2 — currently off)

`DisplayModeService` can filter the timeline to one of four modes:

| Mode | What it shows |
|---|---|
| `full_chain` | Everything (default) |
| `keystone_focus` | Only the keystone step (shower, meds) |
| `anchor_only` | Only the anchor blocks, not the prep chain |
| `rest_of_day` | Blocks after the current time |

These are controlled by `IntentPrompt` (when you have anchors) or `FreeActivationPrompt` (anchor-less day). Mode selection is persisted to `sessionStorage` via `DisplayModeSerializer` so it survives page refresh within the same session.

### Multi-anchor progressive disclosure (V2 — off)

When there are multiple anchors in a day, Mirror only expands the chain for the *next* upcoming anchor. Other anchors are shown as collapsed cards. You tap one to expand it. This is `expandedAnchorId` state + `getAnchorChain()` from `DisplayModeService`.

### State Declaration Prompt

Separate from triage. It asks: **"what's your current state?"** with options like "foggy", "overwhelmed", "ready to act". This is shown based on `StateFilterService.shouldShowStatePrompt()` which checks:
- Was the last declaration more than N hours ago?
- Is there still a future anchor in the plan?

When you declare a state, it's written to `user_preferences.last_state_declaration` (not a separate table). The declared state doesn't currently change the plan — it's captured for context but not yet wired to chain filtering.

### Reality Check (V2 — off)

Triggered from the `AnchorInfoCard` when the user taps "Reality Check". Calls `POST /api/daily-plan/reality-check` with the anchor ID. Returns:
- `possibleSteps` — what you can still do
- `skippedSteps` — what has to go
- `alternatives` — `keystone_only`, `skip_all`, or `show_all`
- `runway` and `requiredDuration`

The result is displayed in `RealityCheckPrompt`. Selecting an alternative maps to a triage decision.

### Timeline (`Timeline.tsx`)

The `Timeline` component receives `filteredTimeBlocks` from `MirrorUI` and renders each block. Key rendering rules:

- **Anchor blocks** (`envelopeType === 'anchor'`) → rendered as `AnchorInfoCard` (distinct visual)
- **Travel-there blocks** → rendered as `DepartureWaypoint` (clock-time shown)
- **Everything else** → standard card with: duration label, activity name, envelope tag, keystone star 🌟

Keystone detection is name-based: blocks containing "shower", "meds", "medication", "breakfast" get the star and accent border. This is a bit fragile (hardcoded strings).

**Completion controls** (hidden by default, toggle in settings):
- ✅ Complete — calls `PATCH /api/time-blocks/{id}/complete`
- ⏭ Skip — opens modal asking for reason, then calls the same endpoint with `status: skipped`
- ✏️ Edit — currently a TODO stub (no-op)

**Insert step** (edit mode): shows a + button between blocks, opens a form → calls `POST /api/time-blocks/insert`.

**Offline resilience**: All block mutations go through `resilientMutationFetch()` from `src/lib/triage/retry-handler.ts`. It retries once after 2 seconds, and if that fails, queues the action locally. The queue count is shown in a banner at the top of Mirror when > 0.

### Felt Helpful Prompt (V2 — off)

After 10pm, or 2 hours after the last anchor, Mirror shows: "Did this feel helpful today?" with three options (yes / somewhat / not really). Response is sent to `POST /api/analytics/felt-helpful`. Dismissal is stored in `user_preferences.felt_helpful_dismissed_dates[]` so it doesn't show twice in a day.

### What V2 actually is

`MIRROR_V2_ENABLED` is `false` by default. V2 adds:
- Intent/Free Activation prompts
- Display mode filtering
- Multi-anchor progressive disclosure
- Reality check
- Felt Helpful prompt
- Telemetry events (batched, fire-and-forget, only if user opts in)

None of this is live for users yet. V1 behaviour (full chain, auto-triage) is the active path.

---

## 2. Chain Engine — How the Plan is Built

### What it is

The chain engine is what runs when you generate a plan. It works backwards from your anchors (fixed commitments) to figure out what you need to do and when, including travel, prep, recovery, and wake ramp.

### Files

| File | Role |
|---|---|
| `src/lib/chains/chain-generator.ts` | Main engine (38KB) |
| `src/lib/chains/templates.ts` | Default chain step sequences per anchor type |
| `src/lib/chains/wake-ramp.ts` | Startup sequence after waking up |
| `src/lib/chains/exit-gate.ts` | Boolean checklist before leaving |
| `src/lib/chains/types.ts` | All TypeScript types |
| `src/lib/daily-plan/plan-builder.ts` | Orchestrator that calls ChainGenerator |
| `src/lib/context/daily-context.ts` | Pulls yesterday's habit data to inform durations |

### The mental model

```
You say: wake at 7am, class at 12pm, energy = medium

ChainGenerator works backwards from 12pm:
  12:00 → Anchor (class)
  11:15 → Travel there (45min)
  10:45 → Exit gate (check keys, meds, phone)
  10:15 → Prep (shower, dress, etc) — 30min
  ...
  07:00 → Wake Ramp (75-120min depending on energy)

That gives you: "Start prep by 10:15am. Leave by 11:15am."
```

### Commitment Envelope

Each anchor gets a 5-part envelope:
```
prep → travel_there → anchor → travel_back → recovery
```
These are `ChainStepInstance` objects with actual timestamps. They're stored as `time_blocks` rows in the DB with `metadata.commitment_envelope.envelope_type` to identify which part they are.

### Templates (`templates.ts`)

Anchor types have default step sequences:
- `class` → prep (shower, meds, dress, pack), travel, anchor, travel back, recovery
- `seminar` → lighter prep
- `appointment` → more prep focus
- `workshop` → longer recovery
- `other` → generic

Each step has `duration_estimate`, `is_required`, `can_skip_when_late`.

### Wake Ramp (`wake-ramp.ts`)

Added as the first block if the first anchor is within 2 hours of wake time. Components: toilet, hygiene, shower, dress, buffer. Duration varies:
- Low energy → 120min
- Medium → 90min
- High → 75min

If the plan starts 2+ hours after wake time, wake ramp is skipped entirely.

### Exit Gate (`exit-gate.ts`)

A checklist of conditions that must be true before you leave for an anchor. Defaults: keys, phone, meds, bag. User-configurable. Inserted as a chain step just before `travel_there` in the plan.

### Daily Context (`src/lib/context/daily-context.ts`)

Pulls **yesterday's** (D-1, never same-day) habit entry data to adjust chain durations. If yesterday's data shows you took meds, slept well, ate, etc. — the generator uses tighter time estimates. If there's no data or it shows a rough day — it pads durations.

---

## 3. Daily Plan Page — The Generator

### What it is

`/daily-plan` is where you create a plan. It's a form that asks for wake time, sleep time, and energy state. On submit, it calls `POST /api/daily-plan/generate`.

### Files

| File | Role |
|---|---|
| `src/pages/daily-plan.astro` | Astro page shell |
| `src/components/daily-plan/DailyPlanPageContent.tsx` | Main React component (~40KB) |
| `src/components/daily-plan/PlanGeneratorForm.tsx` | The form |
| `src/components/daily-plan/ChainView.tsx` | Chain-first view of the plan (~35KB) |
| `src/pages/api/daily-plan/generate.ts` | `POST /api/daily-plan/generate` |
| `src/lib/daily-plan/plan-builder.ts` | Called by generate API |

### Generate flow

```
POST /api/daily-plan/generate { wakeTime, sleepTime, energyState }
  → Requires auth (requireAuth())
  → Fetches calendar events + manual anchors for today
  → If no anchors: returns 422 { code: "MANUAL_ANCHOR_REQUIRED" }
  → Calls PlanBuilder.buildPlan()
  → Deletes existing plan for user+date (idempotent)
  → Inserts new daily_plans row + time_blocks rows
  → Returns the full plan
```

### Manual anchors

If you have no calendar integration, you add anchors manually. `POST /api/daily-plan/generate` accepts manual anchors in the request body, or they can be pre-saved via `POST /api/manual-anchors`. These are stored in the `manual_anchors` table.

### ChainView

The chain view (`ChainView.tsx`) is the primary display after plan generation. It's different from the Timeline in Mirror — it shows the full chain structure grouped by anchor, with `suggested_start_by`, `ready_to_leave_by`, and `anchor_at` timing labels computed from `timing_signals`.

---

## 4. Habits — The Logging System

### What it is

Habits is a tracker for recurring daily activities. Not a streak-gamification system — it's a logging tool where the data informs the chain engine's duration estimates.

### Files

| File | Role |
|---|---|
| `src/pages/habits.astro` | Main habits page (36KB — lots of inline React) |
| `src/lib/habits/streaks.ts` | Streak calculation |
| `src/lib/habits/note-parser.ts` | Parses free-text notes into structured data |
| `src/lib/habits/taxonomy.ts` | Semantic classification (sleep, meds, hygiene, etc.) |
| `src/lib/import/enhanced-loop-habits-v2.ts` | CSV import from Loop Habits app |
| `src/pages/api/habits/` | CRUD endpoints |

### How streaks work

`streaks.ts` calculates current streak and longest streak from `habit_entries`. A streak counts consecutive days with a `completed` entry. Missing a day breaks it. The entry status is one of: `completed`, `skipped`, `partial`.

### Note parser

`note-parser.ts` extracts structured fields from free-text notes. For example: "took meds, slept 7h, no shower" → `{ meds: true, sleep_hours: 7, hygiene: false }`. This parsed data feeds into `DailyContext`.

### Import

The Loop Habits importer (`enhanced-loop-habits-v2.ts`) handles CSV format from the Android Loop Habits app. It has dedup logic — if the same habit+date combination already exists, it merges rather than duplicates. The uniqueness constraint is enforced in migration `20260215001000_habit_entries_merge_per_day_uniqueness.sql`.

---

## 5. Auth — How Login Works

### Two contexts

**Server-side** (API routes, middleware):
```ts
const serverAuth = createServerAuth(cookies); // ServerAuth instance
const user = await serverAuth.requireAuth();  // throws if not logged in
user.id; // always use this, never client payload
serverAuth.supabase; // user-scoped Supabase client
```

**Client-side** (React components):
```ts
const { user, session } = useAuth(); // from AuthProvider in context.tsx
```

### ServerAuth class (`simple-multi-user.ts`)

Despite the name, it's not complex. It wraps `createServerClient(cookies)` from Supabase and provides:
- `getUser()` — returns user or null
- `requireAuth()` — throws if no user
- `getUserPreferences()` — fetches from `user_preferences` table and normalizes
- `deductTokens()` / `addTokens()` — token ledger operations
- `initializeNewUser()` — called on first sign-up, sets up token balance and simulated wallet

### Middleware (`src/middleware.ts`)

Runs on every request. Sequence:
1. Classify route (static / public / protected)
2. Static assets → skip
3. API routes and public routes → skip auth (APIs do their own `requireAuth()`)
4. Root `/` → if logged in, redirect to `/dashboard`; if not, show landing
5. Protected routes → check session → check onboarding → check billing → allow

---

## 6. Billing / Trial Gate

### How it works

`getBillingSnapshot(preferences)` in `src/lib/billing/subscription.ts` reads `user_preferences.preferences.subscription_status` and `trial_end_date`.

`isAccessAllowed = true` when:
- `subscription_status === 'active'` or `'premium'`
- Or `status === 'trial'` and trial hasn't expired

### The bypass (added May 2026)

`PUBLIC_BILLING_BYPASS=true` in `.env` → returns `isAccessAllowed: true` always. Does not affect production unless you add it to Vercel env vars.

### Moving away from billing

Ideas.txt item 1: switching from subscription to support/donate model. The entire billing gate is going to become dead code soon. The `billing.astro` page and `getBillingSnapshot()` will need rethinking once that decision is final.

---

## 7. Component Map (daily-plan folder)

| Component | What it does |
|---|---|
| `MirrorUI.tsx` | Root mirror view — all the state |
| `Timeline.tsx` | Renders sorted time blocks |
| `TimeBlock.tsx` | Individual block (used in ChainView, not Timeline) |
| `MirrorHeader.tsx` | Top bar: recalculate, edit toggle, display mode controls |
| `ChainView.tsx` | Plan generator result view |
| `DailyPlanPageContent.tsx` | Shell for the /daily-plan page |
| `PlanGeneratorForm.tsx` | Wake/sleep/energy form |
| `AnchorInfoCard.tsx` | Special card for anchor blocks in Timeline |
| `DepartureWaypoint.tsx` | "Leave by" block for travel-there steps |
| `StateDeclarationPrompt.tsx` | "How are you feeling?" prompt |
| `TriagePrompt.tsx` | Options when time is short (lazy loaded) |
| `RealityCheckPrompt.tsx` | V2: alternative paths when late |
| `IntentPrompt.tsx` | V2: "What do you need right now?" |
| `FreeActivationPrompt.tsx` | V2: anchor-less day prompt |
| `FeltHelpfulPrompt.tsx` | V2: end-of-day "was this useful?" |
| `IntentSignalBanner.tsx` | Banner if no plan exists yet |
| `ChainStartSelector.tsx` | V2: "Start now / in 10min / when ready" |
| `InlineEditor.tsx` | Block edit UI (partially built) |
| `DeadlineBanner.tsx` | Urgency banner |
| `ExitTimeDisplay.tsx` | Shows "Leave by X" prominently |
| `ChainMirror.tsx` | Compact mirror view (used inside ChainView) |
| `DeletePlanButton.tsx` | Deletes today's plan |
| `DegradePlanButton.tsx` | Degrade Plan — removed from active UI (keep for now) |
| `ErrorBoundary.tsx` | Wraps MirrorUI |

---

## Feature flags — what's actually on

```ts
TRIAGE_MIRROR_ENABLED: true      // Mirror is live
STATE_DECLARATION_ENABLED: true  // "How are you feeling" prompt is live
STATELESS_RECALC_ENABLED: true   // Recalculate button works
INLINE_EDITING_ENABLED: true     // Edit mode toggle exists (editing itself is TODO)

MIRROR_V2_ENABLED: false         // All V2 features off
MIRROR_V2_NEUTRAL_DISPLAY: false
MIRROR_V2_FLEXIBLE_START: false
MIRROR_V2_OPTIONAL_TRACKING: false
MIRROR_V2_TELEMETRY: false
```

V2 is a significant rework of how Mirror presents information. It's built but gated. The current active experience is V1 — full chain, auto-triage when late, no display mode filtering.
