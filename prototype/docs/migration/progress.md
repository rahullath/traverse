# redesign branch — progress log

Branch: `redesign` (off `feature/mirror-recovery-v2`, tagged `pre-redesign`)

---

## What was done

### Phase 0–1 · Tokens
`src/styles/tokens.css` — full paper-and-ink token layer ported from `prototype/styles.css`.
Daylight and lamp themes, density scale (`--space-1` → `--space-8`), all `tv-*` CSS classes.
Imported at the end of `src/styles/global.css` — no conflicts with existing `--messy-*` variables.

`tailwind.config.mjs` — extended with `paper`, `ink`, `rule`, `tv-accent` color aliases and `serif`/`mono` font stacks. Existing entries untouched.

### Phase 2 · Primitives
`src/components/tv/` — 13 components:

| File | What it is |
|---|---|
| `Block.tsx` | Timeline row. Derives margin mark from `state` + `keystone`. The "now" band bleeds to page edges via negative-margin (only works inside `<Page>`). |
| `Button.tsx` | 4 variants: `default`, `primary`, `quiet`, `ghost`. |
| `Card.tsx` | Thin border card, `quote` variant for left-rule callouts. |
| `Display.tsx` | Editorial serif heading. |
| `Label.tsx` | Small mono caps used as marginalia. |
| `Mark.tsx` | Standalone margin glyph (`now` / `keystone` / `past`). |
| `Page.tsx` | Root wrapper — applies `tv-app` + `tv-page`, handles theme/density/motion props. |
| `Prompt.tsx` | In-screen dialog (state declaration, triage, felt-helpful chrome). |
| `Prose.tsx` | Body serif text. |
| `Rule.tsx` | 1px hairline, `strong` variant. |
| `Runway.tsx` | Big mono countdown + serif caption. |
| `Seg.tsx` | Segmented control for settings. |
| `Setting.tsx` | Settings row (name + hint + control slot). |

`src/components/tv/index.ts` — barrel export for all of the above.

`src/lib/copy/voice.ts` — full voice register dictionary (`plain` / `clinical` / `warm`) covering state declaration, triage, felt-helpful, footer, and declare button copy.

`src/pages/_dev/tv.astro` — dev-only preview at `/_dev/tv`. Renders every primitive with interactive theme/density toggles. Redirects to `/` in prod.

### Phase 3 · MirrorUI.v2
`src/components/daily-plan/MirrorUI.v2.tsx` — new visual shell, identical business logic.

**Kept verbatim from `MirrorUI.tsx`:**
- All state (display mode, chain start time, reality check, telemetry batch refs, etc.)
- All effects (online/offline, telemetry timer, sessionStorage restore, passed-anchor check every 60s, end-of-day felt-helpful check every 5 min, anchor expansion)
- All computed values (`filteredTimeBlocks` with multi-anchor progressive disclosure, `projectedCurrentTime`, `projectionNote`, `keystoneActivity`)
- All handlers (`handleTriageDecision`, `handleRealityCheck`, `normalizeRealityCheckResult`, `patchLocalBlockStatus`, `resilientMutationFetch` calls, display mode serializer writes)
- `IntentPrompt`, `FreeActivationPrompt`, `StateDeclarationPrompt`, `RealityCheckPrompt`, `TriagePrompt` — all kept as-is

**Changed (render only):**
- Outer shell → `<Page>`
- Header → `tv-head` with live clock (updates every 30s)
- Loading / error / empty states → tv-styled (`Label`, `Prompt`, `Prose`)
- `<MirrorHeader>` → inline date + mode indicator
- `<Timeline>` → inline `<Block>` rendering; block state derived from `block.status` + current time; meta from `commitment_envelope.envelope_type`
- Completion / skip / delete / reality-check controls kept, rendered as `tv-close` action strips below each block
- `<Runway>` from tv/ wired to `data.runway` (`RunwayCalculation`)
- `FeltHelpfulPrompt` → tv/ `<Prompt>` + `<Button>`, voice-register aware
- Edit / recalculate → `<Button variant="quiet">` at the bottom

`src/components/daily-plan/MirrorUIWithErrorBoundary.tsx` — now branches on `MIRROR_V2_ENABLED`. Component selection is at **module level** (not inside render) so the reference is stable.

---

## How to enable v2

Set `PUBLIC_MIRROR_V2_ENABLED=true` in `.env.local` and restart the dev server.

Or temporarily flip the default in `src/lib/feature-flags.ts`:
```ts
[FEATURE_FLAGS.MIRROR_V2_ENABLED]: true,
```
Vite HMR picks this up without a restart.

Revert either change to go back to the old UI instantly.

---

## What is NOT done yet

Everything from Phase 4 onwards in the Migration Guide:

- **Phase 4** — IA collapse (20 routes → 7, middleware redirects)
- **Phase 5** — State tiers, nightly retention job, delete-account endpoint, billing stub
- **Phase 6** — Onboarding rewrite (4 cards)
- **Phase 7** — Settings page, clinical page, plan generator re-skin; reskin of `IntentPrompt`, `FreeActivationPrompt`, `StateDeclarationPrompt`, `RealityCheckPrompt`, `TriagePrompt` with tv/ primitives
- **Phase 8** — Delete `messy-theme.css`, habits, billing, old `MirrorUI.tsx`, drop tables

The v2 UI currently looks rough because the sub-prompts (`IntentPrompt`, `StateDeclarationPrompt`, etc.) still render with messy-theme styles inside the new paper shell — Phase 7 fixes that.

Note: the final `TodayPageContent.tsx`/`PlanPageContent.tsx` implementation diverged from this v2 shell — it's a fresh rewrite, not a reskin, and dropped more functionality than the guide called for in the process. See [`parity-gaps.md`](./parity-gaps.md) for the prioritized list of what's a real gap (worth restoring) vs. an intentional cut per this guide's own ethos calls.

---

## 2026-07-16 — commit checkpoint

A large amount of Phase 4+ work (IA collapse redirects in `src/middleware.ts`, the new
`/today`, `/plan`, `/clinical`, `/settings/*` pages and their components, `MIRROR_V2_ENABLED`
flipped on, PWA manifest/service-worker rename to `traverse`) had been sitting **uncommitted**
in the working tree — none of it had reached GitHub. It's committed as of this checkpoint so
it isn't one lost laptop away from disappearing. It has **not** been independently line-audited
this session beyond: a clean `npm run build`, and browser smoke tests of `/login` and
`/reset-password`. Treat it as "believed working, not yet reviewed" rather than "verified."

Also done this session, fully verified (build + browser, mobile + desktop viewport):
- **Reset-password flow reskinned.** `src/components/auth/ResetPasswordScreen.tsx` (new) replaces
  the old dark-theme `PasswordResetForm.tsx` for the post-email-link "set a new password" step.
  The "request a link" step already lived inline in `AuthScreen.tsx` (new design) — this closes
  the one leg of the auth flow still on the old theme. `src/pages/reset-password.astro` now only
  ever renders the update-mode screen; hitting it without a valid reset token redirects to
  `/login` server-side (the request flow lives there). Old page preserved at
  `reset-password.legacy.astro` per the same rollback convention already used for
  login/onboarding/settings.
- **Fixed a real (pre-existing) mobile layout bug found while testing the above**: `.tv-app` used
  `min-height: 100%`, which only resolves against an ancestor's explicit height. Since `html`/`body`
  never get one, any tv/-design page shorter than the viewport (any auth screen's success state,
  this new reset screen, etc.) showed a strip of the old dark theme's body background bleeding in
  underneath. Fixed by switching to `min-height: 100vh` in `src/styles/tokens.css` (viewport-relative,
  no ancestor-height dependency). Confirmed fixed on `/reset-password` at 375×812; confirmed no
  regression on `/login` at both viewport sizes.

**Not done, flagged for whoever picks this up next** (see `parity-gaps.md` for the fuller,
prioritized version of this list):
- No error boundary wraps `/today` or `/plan` — an unhandled render exception still produces a
  blank page. `src/components/daily-plan/ErrorBoundary.tsx` exists and is reusable; it just isn't
  wired to these pages yet.
- `handleComplete`/`handleSkip` in `TodayPageContent.tsx` swallow fetch failures silently
  (`.catch(() => {})`) — no retry, no offline queueing, no error surfaced to the user, even though
  `NetworkBanner`'s "queued" variant is already built and listening for events nothing yet fires.
- State declaration only offers 3 of the old 6 states (missing "already at anchor," "missed it,"
  "mid-chain").
- No calendar import (ICS/link), no anchor-type taxonomy/suggestions, no editable plan-generation
  fields (wake/sleep/anchor type are hardcoded in `PlanPageContent.tsx`) — all still to build for
  beta per the user's stated scope.
