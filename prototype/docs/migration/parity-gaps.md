# MirrorUI v1 → redesign: functional parity gaps

Companion to [`progress.md`](./progress.md). That log tracks phase completion; this
tracks a specific question raised mid-Phase-9-ish: **what did `MirrorUI.tsx` (v1) do
that `TodayPageContent.tsx` / `PlanPageContent.tsx` don't do yet, and which of those
gaps are actually supposed to be closed** per `Migration Guide.html`, versus which
were deliberate cuts the guide already calls for.

Full raw audit (every difference, no filtering) is preserved in this repo's chat
history if needed later; this doc is the filtered, prioritized version — grounded in
what the guide actually says, not just what v1 happened to have.

---

## Retain / reimplement — prioritized

### 1. Resilient mutation handling (offline queue + idempotency + error surfacing)
**Status: explicitly planned (Phase 10), partially scaffolded, not wired.**

The guide specs this in detail: complete/skip/edit/delete must survive a flaky
connection via a client-side action queue with an idempotency key, retried on
`online` + exponential backoff, **with mandatory server-side dedupe** on
`/api/daily-plan/state`, `/complete`, `/skip` — "an idempotency key with no
server-side dedupe just means a flaky network double-completes a block."

The UI shells already exist — `tv/NetworkBanner` (offline / queued / install
variants) and `tv/ErrorFallback` are built and used in `TodayPageContent.tsx`. But
the wiring behind them isn't there:
- `handleComplete`/`handleSkip` in `TodayPageContent.tsx:108-130` do plain
  `fetch(...).catch(() => {})` — failures vanish silently, nothing queues, nothing
  retries.
- The page still *listens* for `offline-queue-size` / `offline-queue-flushed`
  events and will render the "queued" banner — but nothing in the page's own code
  path ever fires those events, so that banner is currently unreachable dead UI.
- No idempotency key generated client-side; no dedupe check added to the three
  mutating endpoints server-side.

Old reference: `MirrorUI.tsx:845-957`, `src/lib/triage/retry-handler.ts`
(`resilientMutationFetch`).

**Why this is top priority:** it's the most concretely specified gap in the guide
(down to the queue shape and banner copy), it's silent data loss today, not just a
missing nicety, and it's the direct mechanism behind the black-screen bug we just
fixed — an unhandled failure here has no error boundary to catch it (see #2).

### 2. Error boundary around Today/Plan
**Status: explicitly planned (Phase 10), not present.**

Guide: "Error boundary — wrap MirrorUI (both v1 and v2) in the existing boundary;
fallback matches `TodayErrorFallback`." `TodayPageContent.tsx`'s `error` mode only
covers a failed *initial* `/api/daily-plan/mirror` fetch — it is not a React error
boundary. Any render-time exception anywhere else in the tree still produces a
blank page with no fallback. `src/components/daily-plan/ErrorBoundary.tsx` already
exists and is a clean, reusable class component — it just isn't wrapped around
`TodayPageContent` / `PlanPageContent` in their `.astro` pages.

### 3. Reality check
**Status: explicitly planned ("same `<Prompt>` chrome, voice-aware copy"), fully missing.**

Guide lists it alongside triage and felt-helpful as one of the three prompts to
port with the same `<Prompt>` chrome and voice-register-aware copy from
`src/lib/copy/voice.ts` (which already exists and already has triage/felt-helpful
entries — reality-check copy likely needs adding). Currently there is no button, no
handler, no call to `/api/daily-plan/reality-check`, anywhere in the new UI.

This is the single largest *feature* gap (as opposed to reliability gap): it's the
core "I'm behind, what can I actually still do" mechanism — directly executive-
function-support-shaped, not a nice-to-have.

Old reference: `MirrorUI.tsx:1091-1175`, `RealityCheckPrompt.tsx`.

### 4. Block edit / delete
**Status: implied by Phase 10's own action list, missing.**

The guide's resilient-action spec explicitly types the queue as
`kind: 'complete'|'skip'|'edit'|'delete'` — edit and delete are designed in from
the start, not scope creep. Today's UI only exposes done/skip. No delete-a-block,
no insert-a-step.

Old reference: `Timeline.tsx` edit-mode delete buttons, `/api/time-blocks/insert`,
`DELETE /api/time-blocks/:id/delete`.

### 5. Install banner dismissal cooldown
**Status: explicitly specified, partially built.**

Guide: gate the install banner on `beforeinstallprompt` firing + not already
installed + **not previously dismissed (localStorage flag, 30-day cooldown)**.
`TodayPageContent.tsx:177-179` shows the banner whenever `installable && !installed`
— there's no dismissal state, so a user who dismisses it sees it again on next
visit. Small, but explicitly speced and currently wrong.

### 6. Fuller state-declaration set
**Status: not explicitly speced, but the "prompts round-trip" done-criterion implies full fidelity was intended.**

v1 had six declarable states (`starting_day`, `ready_for_anchor`, `mid_chain` with a
step picker, `at_anchor`, `missed_it`, `just_checking`). The new
`StateDeclaration` in `TodayPageContent.tsx:344-373` only offers three (two
variants of `starting_day` + `just_checking`) — you can no longer declare "I'm
already at the anchor" or "I missed it," which are exactly the states a
recalculation-driven tool most needs to hear. Since state declaration exists
purely to feed the "chain padding" recalculation (per its own label in the UI —
"state · for chain padding only"), a narrower state set means worse recalculation
accuracy, not just a smaller menu.

Old reference: `StateDeclarationPrompt.tsx:16-44`.

### 7. Standalone "recalculate from now"
**Status: no explicit guide mention; survived v1 → v2 intact, dropped only in the final cut — looks like an accidental drop, not a decision.**

Both `MirrorUI.tsx:737-762` and `MirrorUI.v2.tsx:1024-1032` kept this as a
footer action independent of triage. The new pages only expose recalculate as one
of triage's three options, which means you can't recalculate without first
declaring you're behind schedule.

---

## Confirmed intentional cuts — do not reimplement

The guide is explicit about these; the "gap" is by design, not oversight.

- **Analytics/telemetry beyond felt-helpful.** Guide, Tier 5 · Delete: "Felt-helpful
  is the only signal aligned with the ethos ('did the tool carry the load?'); the
  rest of `src/pages/api/analytics/*` and `src/pages/api/monitoring/*` should go."
  The full telemetry batching in `MirrorUI.tsx:91-95,204-239,633-671,1112-1362` and
  the orphaned `useMirrorSessionTracking.ts` are correctly absent from the new UI.
- **Token balance / billing UI.** Guide, Tier 5 · Delete + kill-switch audit:
  "Billing / tokens. Stance: stub `getBillingSnapshot()` to always return
  `{ isAccessAllowed: true }`. Drop tables after a soak." The old `MirrorHeader`
  token balance display (`MirrorUI.tsx:522-532`) should not come back.
- **"Complete by" deadline banner / envelope grouping.** Guide explicitly: "Remove
  synthetic chain reconstruction and any 'Complete by' label — replace every call
  site with the three explicit signals" (`suggested_start_by`, `ready_to_leave_by`,
  `anchor_at`, `effective_arrival_deadline`). This is exactly what `TimingStrip`
  already does. The loss of `DeadlineBanner.tsx` / `StartTimeLabel.tsx` /
  envelope-level grouping from `Timeline.tsx` is the intended outcome, already
  shipped correctly — not a gap.
- **Habits/streaks, confetti/chart libraries, dashboard route, monitoring routes
  outside dev.** All named in the guide's kill-switch audit. Unrelated to
  MirrorUI specifically but confirming the same ethos applies repo-wide.

## Judgment calls — guide is silent, ethos suggests caution

- **7-day-absence "welcome back" banner** (`IntentSignalBanner.tsx`,
  `/api/daily-plan/check-absence`). Not named in the guide, but it's a time-based
  re-engagement nudge — the same shape as the streaks/telemetry mechanics the guide
  explicitly kills ("no streak fire... voice that names time physics instead of the
  person"). Recommend treating as **not** worth reimplementing unless a real user
  need surfaces; it cuts against the "stateless, no retention loops" framing in the
  app's own manifest description.
- **Auto-surfacing felt-helpful** (time-based trigger + server-side "already asked
  today" dedup). The felt-helpful *prompt itself* is confirmed in-scope (see kill
  list above — it's the one analytics signal kept). But the old auto-trigger
  (22:00 or 2h-post-anchor, checked every 5 min) plus persisted dismissal tracking
  has a light nagging quality. Current new-side behavior — reachable only via an
  explicit "End the day in the app" button — is arguably more aligned with the
  ethos than restoring the timer. Worth a product call, not an obvious restore.

## Lower priority / needs a product decision, not clearly speced either way

- Chain execution richness (drag-reorder, exit-gate reliability indicators,
  travel-fallback warnings) — old `ChainView.tsx`, on a route that's now dead via
  301 redirect. No guide mention; plausible the static "screenshot this" plan
  result in `PlanPageContent.tsx` is the intended simplification, consistent with
  "paper-and-ink" framing, but worth confirming rather than assuming.
- Plan lifecycle management — degrade-to-essentials, delete-plan-with-confirm,
  multi-commitment `ExitTimeDisplay`. No guide mention.
- `PlanGeneratorForm`'s editable wake/sleep/anchor-type/notes fields vs.
  `PlanPageContent.tsx`'s current hardcoded values. Affects real flexibility of
  plan generation; no explicit guide mention either way.
