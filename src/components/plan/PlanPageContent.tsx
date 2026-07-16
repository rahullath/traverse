import React, { useState, useEffect } from 'react';
import { Page, Button, Card, TimingStrip } from '@/components/tv';
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
}

interface TravelChoice {
  label: string;
  totalMinutes: number;
  maxLateMinutes: number;
  departureSlots: string[];
  sameLocation: boolean;
}

function calculateDefaultWakeTime(): string {
  const now = new Date();
  if (now.getHours() < 12) return '07:00';
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

export default function PlanPageContent({ voice, theme, density, motion = true, timeFormat = 'clock', anchorless }: Props) {
  const [mode, setMode] = useState<'wizard' | 'empty'>('wizard');
  const [step, setStep] = useState(0);
  const [anchor, setAnchor] = useState<AnchorChoice | null>(null);
  const [energy, setEnergy] = useState<EnergyState | null>(null);
  const [travel, setTravel] = useState<TravelChoice | null>(null);

  const [events, setEvents] = useState<CalendarEventOption[]>([]);
  const [profiles, setProfiles] = useState<TravelProfile[]>([]);

  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('11:00');

  const [addingProfile, setAddingProfile] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftMinutes, setDraftMinutes] = useState(20);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  useEffect(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    fetch(`/api/calendar/events?start_date=${startOfDay.toISOString()}&end_date=${endOfDay.toISOString()}`)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents(d.events ?? []))
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
      const wakeTime = todayAt(calculateDefaultWakeTime());
      let sleepTime = todayAt('23:00');
      if (sleepTime <= wakeTime) sleepTime = new Date(sleepTime.getTime() + 24 * 60 * 60000);

      const energyState: EnergyState = energy ?? 'medium';

      const manualAnchor = anchor ? {
        title: anchor.title,
        start_time: anchor.startISO,
        end_time: anchor.endISO,
        location: travel?.label ?? null,
        location_label: travel?.label ?? null,
        max_late_minutes: travel?.maxLateMinutes ?? 0,
        location_travel_minutes: travel?.sameLocation ? 0 : (travel?.totalMinutes ?? 0),
        departure_slots: travel?.departureSlots ?? [],
        anchor_type: 'other',
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
        <EmptyContent variant={anchorless} onBuildAnchor={() => { setMode('wizard'); setStep(0); }} />
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
              setAnchor({ title: ev.title, startISO: ev.start_time, endISO: ev.end_time });
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
            </div>
            <div className="tv-actions">
              <Button variant="primary" hint="→" onClick={() => {
                if (!customTitle.trim()) return;
                const start = todayAt(customTime);
                const end = new Date(start.getTime() + 60 * 60000);
                setAnchor({ title: customTitle.trim(), startISO: start.toISOString(), endISO: end.toISOString() });
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

function PlanResult({ anchor, plan, generating, error, timeFormat, onRetry, onOpen, onBack }: {
  anchor: AnchorChoice | null;
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

export function EmptyContent({ variant, onBuildAnchor }: { variant: Anchorless; onBuildAnchor: () => void }) {
  if (variant === 'refuse') return <EmptyRefuse onBuildAnchor={onBuildAnchor} />;
  if (variant === 'choice') return <EmptyChoice onBuildAnchor={onBuildAnchor} />;
  return <EmptySuggest onBuildAnchor={onBuildAnchor} />;
}

function EmptySuggest({ onBuildAnchor }: { onBuildAnchor: () => void }) {
  const zeitgebers = [
    { label: 'Sunlight on your face.', meta: 'environmental · ~5 min' },
    { label: 'The next time you eat.', meta: 'bodily · whenever' },
    { label: 'The first message you reply to.', meta: 'social · cue' },
    { label: 'A flatmate makes tea.', meta: 'social · ambient' },
    { label: 'Feeding a pet, if you have one.', meta: 'bodily · routine' },
    { label: 'Sunset.', meta: 'environmental · soft close' },
  ];
  return (
    <>
      <div className="tv-label">social zeitgebers · pick one to build from</div>
      <h1 className="tv-display">
        Nothing is fixed today. <em>What's the next thing that happens whether you act or not?</em>
      </h1>
      <p className="tv-prose">
        Time-blind brains are weaker at clock-time and stronger at events. Pick any one of these — a chain can be hung off it.
      </p>
      <div className="tv-actions">
        {zeitgebers.map(o => (
          <button key={o.label} className="tv-btn" onClick={onBuildAnchor}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">{o.meta}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function EmptyRefuse({ onBuildAnchor }: { onBuildAnchor: () => void }) {
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
        <Button variant="quiet" hint="switch" onClick={onBuildAnchor}>Show me a zeitgeber instead</Button>
      </div>
      <p className="tv-foot-note">The app stores nothing about this. There is no streak to break.</p>
    </>
  );
}

function EmptyChoice({ onBuildAnchor }: { onBuildAnchor: () => void }) {
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
        <Button variant="primary" onClick={onBuildAnchor}>Find an anchor</Button>
      </Card>
      <Card style={{ marginTop: 4 }}>
        <div className="tv-label">option · two</div>
        <p className="tv-serif" style={{ fontSize: 20, margin: 0, lineHeight: 1.25 }}>
          Today is a rest day on purpose. One small act, then close the app.
        </p>
        <Button onClick={() => { window.location.href = '/today'; }}>Rest day</Button>
      </Card>
      <p className="tv-foot-note">Either is a complete day. Neither is failure.</p>
    </>
  );
}
