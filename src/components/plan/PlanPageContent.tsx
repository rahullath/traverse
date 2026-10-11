import React, { useState, useEffect } from 'react';
import { Page, Button, Card, TimingStrip, ErrorFallback, Seg } from '@/components/tv';
import { suggestAnchorType } from '@/lib/anchors/suggest-type';
import type { AnchorType } from '@/lib/anchors/types';
import { ErrorBoundary } from '@/components/daily-plan/ErrorBoundary';
import type { Register } from '@/lib/copy/voice';
import { formatTime, type TimeFormat } from '@/lib/copy/time';
import { deriveBlockState, blockEnv, isKeystoneBlock } from '@/lib/daily-plan/block-render';
import type { DailyPlan, EnergyState, TimeBlock } from '@/types/daily-plan';

type Anchorless = 'choice' | 'suggest' | 'refuse';

export interface Props {
  voice: Register;
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
  motion?: boolean;
  timeFormat?: TimeFormat;
  anchorless: Anchorless;
  /** HH:MM from onboarding (`wake_window_start`), if set. */
  wakeDefault?: string;
  /** HH:MM from onboarding (`sleep_window_end`), if set. */
  sleepDefault?: string;
}

interface CalendarEventOption {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface TravelProfile {
  id: string;
  label: string;
  travel_minutes: number;
  departure_slots: string[];
  strict_by_default: boolean;
}

interface AnchorChoice {
  title: string;
  startISO: string;
  endISO: string;
  type: AnchorType;
}

const ANCHOR_TYPES: { value: AnchorType; label: string }[] = [
  { value: 'class', label: 'Class' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'appointment', label: 'Appt' },
  { value: 'other', label: 'Other' },
];

const DURATIONS = [30, 60, 90, 120, 180];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

interface TravelChoice {
  label: string;
  totalMinutes: number;
  maxLateMinutes: number;
  departureSlots: string[];
  sameLocation: boolean;
}

function calculateDefaultWakeTime(preferred?: string): string {
  const now = new Date();
  if (now.getHours() < 12) return preferred && HHMM.test(preferred) ? preferred : '07:00';
  const roundedMinute = Math.floor(now.getMinutes() / 15) * 15;
  return `${String(now.getHours()).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}`;
}

function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function PlanPage(props: Props) {
  return (
    <ErrorBoundary
      fallback={(_error, reset) => (
        <Page theme={props.theme} density={props.density} motion={props.motion} active="plan">
          <ErrorFallback
            message="Building the chain hit an error while rendering. Nothing you've saved was lost."
            onRetry={reset}
            retryLabel="Try again"
            onSecondary={() => { window.location.href = '/today'; }}
            secondaryLabel="Back to today"
          />
        </Page>
      )}
    >
      <PlanPageContent {...props} />
    </ErrorBoundary>
  );
}

function PlanPageContent({ voice, theme, density, motion = true, timeFormat = 'clock', anchorless, wakeDefault, sleepDefault }: Props) {
  const [mode, setMode] = useState<'wizard' | 'empty'>('wizard');
  const [step, setStep] = useState(0);
  const [anchor, setAnchor] = useState<AnchorChoice | null>(null);
  const [energy, setEnergy] = useState<EnergyState | null>(null);
  const [travel, setTravel] = useState<TravelChoice | null>(null);

  const [events, setEvents] = useState<CalendarEventOption[]>([]);
  const [profiles, setProfiles] = useState<TravelProfile[]>([]);

  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState(() => minutesFromNow(120));
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const [customDuration, setCustomDuration] = useState(60);

  const [wake, setWake] = useState(() => calculateDefaultWakeTime(wakeDefault));
  const [sleep, setSleep] = useState(() => (sleepDefault && HHMM.test(sleepDefault) ? sleepDefault : '23:00'));

  const [addingProfile, setAddingProfile] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftMinutes, setDraftMinutes] = useState(20);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  useEffect(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const loadEvents = () =>
      fetch(`/api/calendar/events?start_date=${startOfDay.toISOString()}&end_date=${endOfDay.toISOString()}`)
        .then(r => r.ok ? r.json() : { events: [] })
        .then(d => {
          const now = Date.now();
          // Only events still ahead of us can be anchors.
          setEvents(((d.events ?? []) as CalendarEventOption[]).filter(ev => +new Date(ev.start_time) > now));
        })
        .catch(() => {});
    loadEvents();
    // Pull fresh events from linked calendars in the background, then refresh.
    fetch('/api/calendar/sync', { method: 'POST' })
      .then(r => { if (r.ok) loadEvents(); })
      .catch(() => {});
    fetch('/api/location-travel-profiles')
      .then(r => r.ok ? r.json() : { profiles: [] })
      .then(d => setProfiles(d.profiles ?? []))
      .catch(() => {});
  }, []);

  const next = () => setStep(s => Math.min(s + 1, 4));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const addProfile = async () => {
    if (!draftLabel.trim()) return;
    const res = await fetch('/api/location-travel-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: draftLabel.trim(), travel_minutes: draftMinutes }),
    }).catch(() => null);
    if (res?.ok) {
      const { profile } = await res.json();
      setProfiles(p => [...p, profile]);
      setTravel({
        label: profile.label,
        totalMinutes: profile.travel_minutes,
        maxLateMinutes: profile.strict_by_default ? 0 : 5,
        departureSlots: profile.departure_slots ?? [],
        sameLocation: false,
      });
    }
    setDraftLabel(''); setDraftMinutes(20); setAddingProfile(false);
    next();
  };

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const wakeTime = todayAt(HHMM.test(wake) ? wake : calculateDefaultWakeTime(wakeDefault));
      let sleepTime = todayAt(HHMM.test(sleep) ? sleep : '23:00');
      if (sleepTime <= wakeTime) sleepTime = new Date(sleepTime.getTime() + 24 * 60 * 60000);

      const energyState: EnergyState = energy ?? 'medium';

      const manualAnchor = anchor ? {
        title: anchor.title,
        start_time: anchor.startISO,
        end_time: anchor.endISO,
        // "Same location" means no travel: don't save it as a travel profile.
        location: travel?.sameLocation ? null : travel?.label ?? null,
        location_label: travel?.sameLocation ? null : travel?.label ?? null,
        max_late_minutes: travel?.maxLateMinutes ?? 0,
        location_travel_minutes: travel?.sameLocation ? 0 : (travel?.totalMinutes ?? 0),
        departure_slots: travel?.departureSlots ?? [],
        anchor_type: anchor.type,
        must_attend: true,
        notes: null,
      } : undefined;

      const res = await fetch('/api/daily-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wakeTime: wakeTime.toISOString(),
          sleepTime: sleepTime.toISOString(),
          energyState,
          manualAnchor,
          replaceManualAnchors: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setGenError(errData.details || errData.error || 'Could not build the chain. Try again.');
        setGenerating(false);
        return;
      }
      const data = await res.json();
      setPlan(data.plan ?? null);
    } catch {
      setGenError('Could not build the chain. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (step === 4 && !plan && !generating && !genError) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (mode === 'empty') {
    return (
      <Page theme={theme} density={density} motion={motion} active="plan">
        <header className="tv-head">
          <div className="tv-head__date">no fixed anchor</div>
          <div className="tv-head__clock">{formatTime(new Date(), timeFormat)}</div>
        </header>
        <EmptyContent
          variant={anchorless}
          onPickAnchor={(a) => {
            if (a) { setCustomTitle(a.title); setCustomTime(a.time); }
            setAnchorError(null);
            setMode('wizard');
            setStep(0);
          }}
          onGentleStart={() => {
            // No anchor: the server builds a gentle home "free activation" chain.
            setAnchor(null);
            setEnergy(e => e ?? 'low');
            setTravel(null);
            setPlan(null);
            setGenError(null);
            setMode('wizard');
            setStep(4);
          }}
        />
      </Page>
    );
  }

  return (
    <Page theme={theme} density={density} motion={motion} active="plan">
      <header className="tv-head">
        <div className="tv-head__date">build a chain</div>
        <div className="tv-head__clock">step {step + 1} of 5</div>
      </header>

      {step === 0 && (
        <PlanStep
          label="anchor · one external event"
          title="What is one external thing in the next 2–8 hours?"
          caption="A class, a shift, a friend coming over, the sunset, the cat's dinner. Anything that happens whether you act or not."
        >
          {events.map(ev => (
            <button key={ev.id} className="tv-btn" onClick={() => {
              setAnchor({ title: ev.title, startISO: ev.start_time, endISO: ev.end_time, type: suggestAnchorType(ev.title) });
              next();
            }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{ev.title} · {formatTime(ev.start_time, timeFormat)}</span>
              <span className="tv-btn__hint">from calendar</span>
            </button>
          ))}
          <div className="tv-card">
            <div className="tv-label">or type your own</div>
            <input
              className="tv-ui"
              placeholder="What, and when — e.g. Linguistics lecture"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              style={{ border: '1px solid var(--rule-strong)', padding: '10px 12px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--serif)', fontSize: 15, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="tv-ui-s">at</span>
              <input
                type="time"
                value={customTime}
                onChange={e => setCustomTime(e.target.value)}
                style={{ border: '1px solid var(--rule-strong)', padding: '6px 8px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 13 }}
              />
              <span className="tv-ui-s">for</span>
              <select
                aria-label="anchor duration"
                value={customDuration}
                onChange={e => setCustomDuration(Number(e.target.value))}
                style={{ border: '1px solid var(--rule-strong)', padding: '6px 8px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 13 }}
              >
                {DURATIONS.map(d => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}${d % 60 ? '.5' : ''} h`}</option>)}
              </select>
            </div>
            <div className="tv-actions">
              {anchorError && <p className="tv-prose" role="alert" style={{ margin: '8px 0 0', fontSize: 15 }}>{anchorError}</p>}
              <Button variant="primary" hint="→" onClick={() => {
                if (!customTitle.trim()) { setAnchorError('Give it a name first — anything works.'); return; }
                const start = todayAt(customTime);
                if (start.getTime() <= Date.now()) {
                  setAnchorError("That time has already passed today — pick a time that's still ahead.");
                  return;
                }
                setAnchorError(null);
                const end = new Date(start.getTime() + customDuration * 60000);
                setAnchor({ title: customTitle.trim(), startISO: start.toISOString(), endISO: end.toISOString(), type: suggestAnchorType(customTitle) });
                next();
              }}>
                Use this anchor
              </Button>
            </div>
          </div>
          <button className="tv-btn tv-btn--quiet" onClick={() => setMode('empty')}>
            <span>I don't have one today</span>
            <span className="tv-btn__hint">go to anchor-less</span>
          </button>
        </PlanStep>
      )}

      {step === 1 && (
        <PlanStep
          label="state · minimum viable"
          title="What do you need to be, just before that?"
          caption="Behavioural activation in one sentence: act first, mood follows. Pick the smallest version that still counts."
        >
          {[
            { label: 'Washed and dressed.', meta: 'standard' },
            { label: 'Have eaten something.', meta: 'one meal counts' },
            { label: 'Already outside the flat.', meta: 'biggest threshold first' },
            { label: 'Emotionally braced. Not in bed.', meta: 'low day' },
          ].map(o => (
            <button key={o.label} className="tv-btn" onClick={next}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
              <span className="tv-btn__hint">{o.meta}</span>
            </button>
          ))}
        </PlanStep>
      )}

      {step === 2 && (
        <PlanStep
          label="ramp · how much time you need"
          title="And how is the energy?"
          caption="This sets how much room the chain leaves you. Not a personality test."
        >
          {([
            { k: 'high', label: 'Clear and ready.', meta: '75 min ramp' },
            { k: 'medium', label: 'A bit foggy.', meta: '90 min ramp' },
            { k: 'low', label: 'Running on empty.', meta: '120 min · rest valid' },
          ] as const).map(o => (
            <button key={o.k} className="tv-btn" onClick={() => { setEnergy(o.k); next(); }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
              <span className="tv-btn__hint">{o.meta}</span>
            </button>
          ))}
        </PlanStep>
      )}

      {step === 3 && (
        <PlanStep
          label="travel · reusable location profile"
          title="How do you get there, and how long does it take?"
          caption="Pick a saved profile, or add a new one — reusable later in Settings → Travel. Home and same-location anchors skip this."
        >
          {profiles.map(p => (
            <button key={p.id} className="tv-btn" onClick={() => {
              setTravel({ label: p.label, totalMinutes: p.travel_minutes, maxLateMinutes: p.strict_by_default ? 0 : 5, departureSlots: p.departure_slots, sameLocation: false });
              next();
            }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{p.label}</span>
              <span className="tv-btn__hint">{p.travel_minutes} min{p.strict_by_default ? ' · strict' : ''}</span>
            </button>
          ))}
          <button className="tv-btn" onClick={() => {
            setTravel({ label: 'Same location', totalMinutes: 0, maxLateMinutes: 0, departureSlots: [], sameLocation: true });
            next();
          }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>Same location — no travel</span>
            <span className="tv-btn__hint">0 min · no block</span>
          </button>
          {!addingProfile ? (
            <button className="tv-btn tv-btn--quiet" onClick={() => setAddingProfile(true)}>
              <span>+ add a location profile</span>
              <span className="tv-btn__hint">label · travel</span>
            </button>
          ) : (
            <div className="tv-card">
              <div className="tv-label">new profile</div>
              <input
                className="tv-ui"
                placeholder="Label — e.g. Home → Library"
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                style={{ border: '1px solid var(--rule-strong)', padding: '10px 12px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--serif)', fontSize: 15, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="tv-ui-s">total travel (min)</span>
                <input
                  type="number"
                  value={draftMinutes}
                  onChange={e => setDraftMinutes(Number(e.target.value))}
                  style={{ width: 64, border: '1px solid var(--rule-strong)', padding: '6px 8px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 13 }}
                />
              </div>
              <div className="tv-actions">
                <Button variant="primary" hint="strict by default" onClick={addProfile}>Save profile</Button>
                <Button variant="ghost" onClick={() => setAddingProfile(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </PlanStep>
      )}

      {step === 4 && (
        <PlanResult
          anchor={anchor}
          wake={wake}
          sleep={sleep}
          onWake={setWake}
          onSleep={setSleep}
          onAnchorType={(t) => setAnchor(a => (a ? { ...a, type: t } : a))}
          plan={plan}
          generating={generating}
          error={genError}
          timeFormat={timeFormat}
          onRetry={generate}
          onOpen={() => { window.location.href = '/today'; }}
          onBack={back}
        />
      )}

      {step > 0 && step < 4 && (
        <button className="tv-btn tv-btn--ghost" onClick={back}>
          <span>← back one step</span>
          <span className="tv-btn__hint" />
        </button>
      )}
    </Page>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const timeInputStyle: React.CSSProperties = { border: '1px solid var(--rule-strong)', padding: '6px 8px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 13 };

function PlanStep({ label, title, caption, children }: {
  label: string; title: string; caption: string; children: React.ReactNode;
}) {
  return (
    <div className="tv-prompt" style={{ borderTop: 'none', paddingTop: 0 }}>
      <div className="tv-label">{label}</div>
      <h2 className="tv-prompt__title" style={{ fontSize: 26 }}>{title}</h2>
      <p className="tv-prompt__caption">{caption}</p>
      <div className="tv-actions">{children}</div>
    </div>
  );
}

function PlanResult({ anchor, wake, sleep, onWake, onSleep, onAnchorType, plan, generating, error, timeFormat, onRetry, onOpen, onBack }: {
  anchor: AnchorChoice | null;
  wake: string;
  sleep: string;
  onWake: (v: string) => void;
  onSleep: (v: string) => void;
  onAnchorType: (t: AnchorType) => void;
  plan: DailyPlan | null;
  generating: boolean;
  error: string | null;
  timeFormat: TimeFormat;
  onRetry: () => void;
  onOpen: () => void;
  onBack: () => void;
}) {
  if (generating) {
    return <p className="tv-prose" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>building the chain…</p>;
  }
  if (error) {
    return (
      <div className="tv-error">
        <div className="tv-label">something went wrong</div>
        <p className="tv-prose" style={{ margin: 0 }}>{error}</p>
        <div className="tv-actions">
          <Button variant="primary" hint="retry" onClick={onRetry}>Try again</Button>
          <Button variant="ghost" onClick={onBack}>Change something</Button>
        </div>
      </div>
    );
  }
  const blocks = plan?.timeBlocks ?? [];
  const now = new Date();
  const anchorBlock = blocks.find(b => b.metadata?.role?.type === 'anchor');
  const timing = anchorBlock?.metadata?.timing_signals;

  return (
    <div className="tv-prompt" style={{ borderTop: 'none', paddingTop: 0 }}>
      <div className="tv-label">chain · written down</div>
      <h2 className="tv-prompt__title" style={{ fontSize: 26 }}>
        Here is your {anchor ? 'chain' : 'day'}. <em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>Copy it down if you like.</em>
      </h2>

      {timing && (
        <TimingStrip
          startBy={formatTime(timing.suggested_start_by, timeFormat)}
          leaveBy={timing.travel_duration_minutes > 0 ? formatTime(timing.ready_to_leave_by, timeFormat) : null}
          anchorAt={formatTime(timing.anchor_at, timeFormat)}
          note={timing.travel_duration_minutes > 0
            ? `${timing.travel_duration_minutes} min travel · effective deadline ${formatTime(timing.effective_arrival_deadline, timeFormat)} (max late ${timing.max_late_minutes}min)`
            : 'Same location — no travel block, no leave-by needed.'}
        />
      )}

      <section style={{ display: 'flex', flexDirection: 'column' }}>
        {blocks.map(b => {
          const bState = deriveBlockState(b, now);
          const isAnchor = b.metadata?.role?.type === 'anchor';
          const isKeystone = isKeystoneBlock(b);
          const isGate = b.metadata?.role?.type === 'exit-gate';
          return (
            <article key={b.id} className={`tv-block tv-block--${bState} ${isKeystone ? 'tv-block--keystone' : ''}`}>
              <div className="tv-block__time">{formatTime(b.startTime, timeFormat)}</div>
              <div className="tv-block__gutter">{isAnchor ? '◇' : isGate ? '⊓' : isKeystone ? '·' : ' '}</div>
              <div className="tv-block__body">
                <div className="tv-block__name" style={isAnchor ? { fontStyle: 'italic' } : undefined}>{b.activityName}</div>
                <div className="tv-block__meta">{blockEnv(b)}{isKeystone ? '  ·  keystone' : ''}{isGate ? '  ·  exit gate' : ''}</div>
              </div>
            </article>
          );
        })}
      </section>

      <Card variant="quote">
        <div className="tv-label">implementation intention</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          <em>When the first step happens, the rest follows from that one if-then.</em>
        </p>
      </Card>

      <details className="tv-card">
        <summary className="tv-label" style={{ cursor: 'pointer' }}>adjust · day bounds &amp; anchor type</summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span className="tv-ui-s">woke</span>
          <input type="time" aria-label="wake time" value={wake} onChange={e => onWake(e.target.value)} style={timeInputStyle} />
          <span className="tv-ui-s">sleep</span>
          <input type="time" aria-label="sleep time" value={sleep} onChange={e => onSleep(e.target.value)} style={timeInputStyle} />
        </div>
        {anchor && (
          <div style={{ marginTop: 10 }}>
            <div className="tv-ui-s" style={{ marginBottom: 4 }}>{anchor.title} is a…</div>
            <Seg value={anchor.type} options={ANCHOR_TYPES} onChange={(v) => onAnchorType(v as AnchorType)} />
          </div>
        )}
        <div className="tv-actions">
          <Button hint="rebuild" onClick={onRetry}>Rebuild the chain</Button>
        </div>
      </details>

      <div className="tv-actions">
        <Button variant="primary" hint="→ live" onClick={onOpen}>Open this in Today</Button>
        <Button hint="back" onClick={onBack}>Change something</Button>
      </div>

      <p className="tv-foot-note">
        Screenshot this. The app does not need to remember it for you — and won't, unless you sign in.
      </p>
    </div>
  );
}

export interface SoftAnchor {
  title: string;
  /** HH:MM, today */
  time: string;
}

/** Next HH:MM at least `minAhead` minutes from now, rounded up to 15 min. */
function minutesFromNow(minAhead: number): string {
  const d = new Date(Date.now() + minAhead * 60000);
  const m = Math.ceil(d.getMinutes() / 15) * 15;
  d.setMinutes(m, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** First of the given HH:MM slots still ≥ minAhead minutes away, else now + fallback. */
function nextSlot(slots: string[], minAhead: number, fallbackAhead: number): string {
  const limit = Date.now() + minAhead * 60000;
  const hit = slots.find(t => todayAt(t).getTime() >= limit);
  return hit ?? minutesFromNow(fallbackAhead);
}

const ZEITGEBERS: { label: string; meta: string; anchor: () => SoftAnchor }[] = [
  { label: 'Sunlight on your face.', meta: 'environmental · ~5 min', anchor: () => ({ title: 'Step outside into daylight', time: minutesFromNow(30) }) },
  { label: 'The next time you eat.', meta: 'bodily · next meal', anchor: () => ({ title: 'Eat something', time: nextSlot(['08:30', '13:00', '19:00'], 45, 60) }) },
  { label: 'The first message you reply to.', meta: 'social · cue', anchor: () => ({ title: 'Reply to one message', time: minutesFromNow(30) }) },
  { label: 'Someone else is around.', meta: 'social · ambient', anchor: () => ({ title: 'Be in the same room as someone', time: minutesFromNow(60) }) },
  { label: 'Feeding a pet, if you have one.', meta: 'bodily · routine', anchor: () => ({ title: 'Feed the pet', time: nextSlot(['08:00', '18:00'], 30, 60) }) },
  { label: 'Sunset.', meta: 'environmental · soft close', anchor: () => ({ title: 'Watch the light go', time: nextSlot(['18:30'], 30, 90) }) },
];

export function EmptyContent({ variant, onPickAnchor, onGentleStart }: {
  variant: Anchorless;
  onPickAnchor: (a: SoftAnchor | null) => void;
  onGentleStart: () => void;
}) {
  const [view, setView] = useState<Anchorless>(variant);
  if (view === 'refuse') return <EmptyRefuse onSuggest={() => setView('suggest')} onGentleStart={onGentleStart} />;
  if (view === 'choice') return <EmptyChoice onSuggest={() => setView('suggest')} onRest={() => setView('refuse')} />;
  return <EmptySuggest onPickAnchor={onPickAnchor} onGentleStart={onGentleStart} />;
}

function EmptySuggest({ onPickAnchor, onGentleStart }: { onPickAnchor: (a: SoftAnchor | null) => void; onGentleStart: () => void }) {
  return (
    <>
      <div className="tv-label">social zeitgebers · pick one to build from</div>
      <h1 className="tv-display">
        Nothing is fixed today. <em>What's the next thing that happens whether you act or not?</em>
      </h1>
      <p className="tv-prose">
        Time-blind brains are weaker at clock-time and stronger at events. Pick one — you can adjust the time on the next screen, and the chain is built backward from it.
      </p>
      <div className="tv-actions">
        {ZEITGEBERS.map(z => (
          <button key={z.label} className="tv-btn" onClick={() => onPickAnchor(z.anchor())}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{z.label}</span>
            <span className="tv-btn__hint">{z.meta}</span>
          </button>
        ))}
        <button className="tv-btn tv-btn--quiet" onClick={() => onPickAnchor(null)}>
          <span>Something else — I'll type it</span>
          <span className="tv-btn__hint">custom</span>
        </button>
        <button className="tv-btn tv-btn--quiet" onClick={onGentleStart}>
          <span>No anchor at all — just a gentle start</span>
          <span className="tv-btn__hint">home chain</span>
        </button>
      </div>
    </>
  );
}

function EmptyRefuse({ onSuggest, onGentleStart }: { onSuggest: () => void; onGentleStart: () => void }) {
  return (
    <>
      <div className="tv-label">no plan</div>
      <h1 className="tv-display">Rest is also valid.</h1>
      <p className="tv-prose">
        Behavioural activation, the clinical evidence base behind every chain in this app, doesn't require a productive day. It requires <strong>one small concrete action</strong> aligned with what you care about. Today, that's allowed to be tiny.
      </p>
      <Card>
        <div className="tv-label">smallest possible</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          <em>Shower. Open a window. Step outside for two minutes. Reply to one message.</em>
        </p>
        <p className="tv-prose" style={{ margin: 0, fontSize: 15 }}>Pick one of these or none at all. Then close the app.</p>
      </Card>
      <div className="tv-actions">
        <Button variant="primary" hint="enough" onClick={() => { window.location.href = '/today'; }}>Close the app</Button>
        <Button hint="home chain" onClick={onGentleStart}>A gentle start, no anchor</Button>
        <Button variant="quiet" hint="switch" onClick={onSuggest}>Show me a zeitgeber instead</Button>
      </div>
      <p className="tv-foot-note">The app stores nothing about this. There is no streak to break.</p>
    </>
  );
}

function EmptyChoice({ onSuggest, onRest }: { onSuggest: () => void; onRest: () => void }) {
  return (
    <>
      <div className="tv-label">no fixed anchor</div>
      <h1 className="tv-display">Two ways today can go.</h1>
      <p className="tv-prose">You don't have to plan to be having a day. Pick whichever sounds more possible right now.</p>
      <Card style={{ marginTop: 4 }}>
        <div className="tv-label">option · one</div>
        <p className="tv-serif" style={{ fontSize: 20, margin: 0, lineHeight: 1.25 }}>
          Find a soft anchor — a meal, the sunset, a friend — and build a small chain backward from it.
        </p>
        <Button variant="primary" onClick={onSuggest}>Find an anchor</Button>
      </Card>
      <Card style={{ marginTop: 4 }}>
        <div className="tv-label">option · two</div>
        <p className="tv-serif" style={{ fontSize: 20, margin: 0, lineHeight: 1.25 }}>
          Today is a rest day on purpose. One small act, then close the app.
        </p>
        <Button onClick={onRest}>Rest day</Button>
      </Card>
      <p className="tv-foot-note">Either is a complete day. Neither is failure.</p>
    </>
  );
}
