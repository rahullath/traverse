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
