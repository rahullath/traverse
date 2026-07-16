import React, { useState, useEffect, useCallback } from 'react';
import type { MirrorData, TriageState } from '@/types/triage';
import type { TimeBlock } from '@/types/daily-plan';
import type { Register } from '@/lib/copy/voice';
import { copy } from '@/lib/copy/voice';
import { formatTime, type TimeFormat } from '@/lib/copy/time';
import { Page, Runway, Button, TimingStrip, NetworkBanner, ErrorFallback } from '@/components/tv';
import { deriveBlockState, blockEnv, isKeystoneBlock } from '@/lib/daily-plan/block-render';
import { pwaService } from '@/lib/pwa/service-worker';

type Mode = 'loading' | 'no-plan' | 'error' | 'declare' | 'timeline' | 'triage' | 'helpful';

export interface Props {
  voice: Register;
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
  motion?: boolean;
  timeFormat?: TimeFormat;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  const dow = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${dow} · ${day}`;
}

function anchorLabel(blocks: TimeBlock[], now: Date): string {
  const next = blocks
    .filter(b => b.metadata?.role?.type === 'anchor' && b.status === 'pending' && new Date(b.startTime) > now)
    .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))[0];
  return next ? `${next.activityName}, ${formatTime(next.startTime)}` : 'anchor';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TodayPageContent({ voice, theme, density, motion = true, timeFormat = 'clock' }: Props) {
  const [mode, setMode] = useState<Mode>('loading');
  const [data, setData] = useState<MirrorData | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [openBlock, setOpenBlock] = useState<string | null>(null);

  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const caps = pwaService.getCapabilities();
    setInstalled(caps.isInstalled);
    setInstallable(caps.isInstallable);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const onQueueSize = (e: Event) => setQueuedCount((e as CustomEvent<{ size: number }>).detail?.size ?? 0);
    const onQueueFlushed = () => setQueuedCount(0);
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => { setInstalled(true); setInstallable(false); };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('offline-queue-size', onQueueSize as EventListener);
    window.addEventListener('offline-queue-flushed', onQueueFlushed);
    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('pwa-installed', onInstalled);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('offline-queue-size', onQueueSize as EventListener);
      window.removeEventListener('offline-queue-flushed', onQueueFlushed);
      window.removeEventListener('pwa-installable', onInstallable);
      window.removeEventListener('pwa-installed', onInstalled);
    };
  }, []);

  const load = useCallback(async () => {
    setMode('loading');
    try {
      const res = await fetch('/api/daily-plan/mirror');
      if (res.status === 404) { setMode('no-plan'); return; }
      if (!res.ok) { setMode('error'); return; }
      const d: MirrorData = await res.json();
      setData(d);
      setMode(d.show_state_prompt ? 'declare' : 'timeline');
    } catch {
      setMode('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeclare = async (state: string) => {
    await fetch('/api/daily-plan/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }).catch(() => {});
    setMode('timeline');
  };

  const handleComplete = async (id: string) => {
    setData(prev => prev
      ? { ...prev, time_blocks: prev.time_blocks.map(b => b.id === id ? { ...b, status: 'completed' as const } : b) }
      : prev);
    setOpenBlock(null);
    await fetch(`/api/time-blocks/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(() => {});
  };

  const handleSkip = async (id: string) => {
    setData(prev => prev
      ? { ...prev, time_blocks: prev.time_blocks.map(b => b.id === id ? { ...b, status: 'skipped' as const } : b) }
      : prev);
    setOpenBlock(null);
    await fetch(`/api/time-blocks/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped', skip_reason: 'user_skipped' }),
    }).catch(() => {});
  };

  const handleTriage = async (triageMode: string) => {
    if (!data?.triage_state.anchor) { setMode('timeline'); return; }
    await fetch('/api/daily-plan/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: triageMode, anchor_id: data.triage_state.anchor.id }),
    }).catch(() => {});
    if (triageMode === 'recalculate') { await load(); return; }
    setMode('timeline');
  };

  const handleFeltHelpful = async (response: string) => {
    await fetch('/api/analytics/felt-helpful', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, date: new Date().toISOString().split('T')[0] }),
    }).catch(() => {});
    // Marks phase-2 onboarding presets as eligible to surface once, next visit.
    await fetch('/api/auth/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase2_eligible_at: new Date().toISOString() }),
    }).catch(() => {});
    window.location.href = '/today';
  };

  const runway = data?.runway;
  const overdue = runway ? !runway.has_sufficient_time && runway.runway !== null : false;
  const v = voice;

  const timingSignal = data?.timing_signals?.find(s => s.anchor_id === runway?.next_anchor_id)
    ?? data?.timing_signals?.[0]
    ?? null;
  const hasTravel = !!timingSignal && timingSignal.travel_duration_minutes > 0;

  return (
    <Page theme={theme} density={density} motion={motion} active="today" wide={!!timingSignal}>

      <header className="tv-head">
        <div className="tv-head__date">{fmtDate(clock)}</div>
        <div className="tv-head__clock">{formatTime(clock, timeFormat)}</div>
      </header>

      {!online && <NetworkBanner variant="offline" />}
      {online && queuedCount > 0 && <NetworkBanner variant="queued" queuedCount={queuedCount} />}
      {online && queuedCount === 0 && installable && !installed && (
        <NetworkBanner variant="install" onInstall={() => pwaService.promptInstall()} />
      )}

      {runway?.runway != null && (
        <Runway
          num={runway.runway}
          label={`runway · ${data ? anchorLabel(data.time_blocks, clock) : 'anchor'}`}
          caption={
            overdue
              ? <>chain wants <span style={{ fontFamily: 'var(--mono)' }}>{runway.required_duration}m</span>. time physics is running tight, not you.</>
              : <>the remaining prep needs <span style={{ fontFamily: 'var(--mono)' }}>{runway.required_duration}m</span>. enough.</>
          }
        />
      )}

      {timingSignal && (
        <TimingStrip
          startBy={formatTime(timingSignal.suggested_start_by, timeFormat)}
          leaveBy={hasTravel ? formatTime(timingSignal.ready_to_leave_by, timeFormat) : null}
          anchorAt={formatTime(timingSignal.anchor_at, timeFormat)}
          lateness={{
            late: overdue,
            overByMinutes: runway?.required_duration != null && runway.runway != null
              ? runway.required_duration - runway.runway
              : undefined,
            maxLateMinutes: timingSignal.max_late_minutes,
            nextFeasibleDeparture: timingSignal.next_feasible_departure_slot
              ? timingSignal.next_feasible_departure_slot
              : null,
          }}
        />
      )}

      {mode === 'loading' && (
        <p className="tv-prose" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>
          loading today's chain…
        </p>
      )}

      {mode === 'no-plan' && (
        <>
          <div className="tv-label">no chain for today</div>
          <h1 className="tv-display">No plan yet.</h1>
          <p className="tv-prose">Build a chain to see today's timeline here.</p>
          <div className="tv-actions">
            <Button variant="primary" hint="→" onClick={() => { window.location.href = '/plan'; }}>
              Build a chain
            </Button>
          </div>
        </>
      )}

      {mode === 'error' && (
        <ErrorFallback
          message="The Mirror hit an error rendering today's chain. Your plan is safe — it's not stored here, and nothing was lost."
          onRetry={load}
          retryLabel="Reload today"
          onSecondary={() => { window.location.href = '/plan'; }}
          secondaryLabel="Build a new chain instead"
        />
      )}

      {mode === 'declare' && (
        <StateDeclaration voice={v} onDeclare={handleDeclare} onClose={() => setMode('timeline')} />
      )}

      {mode === 'timeline' && data && (
        <div className="tv-splitrow">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <section aria-label="today's chain" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="tv-label" style={{ paddingBottom: 8 }}>chain · backward from anchor</div>
              {data.time_blocks.map(block => {
                const bState = deriveBlockState(block, clock);
                const isOpen = openBlock === block.id;
                const isAnchor = block.metadata?.role?.type === 'anchor';
                const isKeystone = isKeystoneBlock(block);
                return (
                  <React.Fragment key={block.id}>
                    <article
                      className={['tv-block', `tv-block--${bState}`, isKeystone ? 'tv-block--keystone' : ''].filter(Boolean).join(' ')}
                      onClick={() => setOpenBlock(isOpen ? null : block.id)}
                      style={{ cursor: 'default' }}
                    >
                      <div className="tv-block__time">{formatTime(block.startTime, timeFormat)}</div>
                      <div className="tv-block__gutter">
                        {bState === 'now' ? '›' : bState === 'past' ? (isKeystone ? '·' : '×') : ''}
                      </div>
                      <div className="tv-block__body">
                        <div className="tv-block__name" style={isAnchor ? { fontStyle: 'italic' } : undefined}>
                          {block.activityName}
                        </div>
                        <div className="tv-block__meta">
                          {blockEnv(block)}{isKeystone ? '  ·  keystone' : ''}
                        </div>
                      </div>
                    </article>
                    {isOpen && bState !== 'past' && (
                      <div style={{ display: 'flex', gap: 8, padding: '6px 0 6px 80px', borderBottom: '1px solid var(--rule)' }}>
                        <button className="tv-close" onClick={e => { e.stopPropagation(); handleComplete(block.id); }}>done</button>
                        <button className="tv-close" onClick={e => { e.stopPropagation(); handleSkip(block.id); }}>skip</button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </section>

            {overdue && (
              <div className="tv-card tv-card--quote">
                <div className="tv-label">time physics</div>
                <p className="tv-prose" style={{ margin: 0 }}>{copy.triage.nudge[v]}</p>
                <button className="tv-btn tv-btn--ghost" onClick={() => setMode('triage')}>
                  <span>{copy.triage.openButton[v]}</span>
                  <span className="tv-btn__hint">→</span>
                </button>
              </div>
            )}

            <div className="tv-actions" style={{ marginTop: 8 }}>
              <Button variant="quiet" hint="state" onClick={() => setMode('declare')}>
                {copy.declareButton[v]}
              </Button>
              <Button variant="quiet" hint="close" onClick={() => setMode('helpful')}>
                End the day in the app
              </Button>
            </div>

            <p className="tv-foot-note">{copy.footer[v]}</p>
          </div>

          {timingSignal && (
            <aside className="tv-rail">
              <div className="tv-card">
                <div className="tv-label">travel · leave-by rail</div>
                <p className="tv-prose" style={{ margin: 0, fontSize: 14 }}>
                  {hasTravel
                    ? <>Leave by <strong>{formatTime(timingSignal.ready_to_leave_by, timeFormat)}</strong> · {timingSignal.travel_duration_minutes} min travel.</>
                    : 'Same location — no travel block, no leave-by needed.'}
                </p>
              </div>
              <div className="tv-card tv-card--quote">
                <div className="tv-label">effective deadline</div>
                <p className="tv-prose" style={{ margin: 0, fontSize: 14 }}>
                  Anchor {formatTime(timingSignal.anchor_at, timeFormat)}, max late {timingSignal.max_late_minutes}min → effective arrival deadline{' '}
                  <strong>{formatTime(timingSignal.effective_arrival_deadline, timeFormat)}</strong>.
                </p>
              </div>
            </aside>
          )}
        </div>
      )}

      {mode === 'triage' && data && (
        <TriageView voice={v} triageState={data.triage_state} onDecide={handleTriage} onClose={() => setMode('timeline')} />
      )}

      {mode === 'helpful' && (
        <FeltHelpfulView voice={v} onAnswer={handleFeltHelpful} onClose={() => setMode('timeline')} />
      )}

    </Page>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StateDeclaration({ voice, onDeclare, onClose }: {
  voice: Register;
  onDeclare: (state: string) => void;
  onClose: () => void;
}) {
  const sd = copy.stateDeclaration;
  const options = [
    { state: 'starting_day',  label: sd.options.clear[voice], meta: '75 min ramp' },
    { state: 'starting_day',  label: sd.options.foggy[voice], meta: '90 min ramp' },
    { state: 'just_checking', label: sd.options.empty[voice], meta: '120 min · rest valid' },
  ];
  return (
    <div className="tv-prompt" role="dialog" aria-label="state declaration">
      <div className="tv-prompt__header">
        <div className="tv-label">state · for chain padding only</div>
        <button className="tv-close" onClick={onClose}>close</button>
      </div>
      <h2 className="tv-prompt__title">{sd.title[voice]}</h2>
      <p className="tv-prompt__caption">{sd.caption[voice]}</p>
      <div className="tv-actions">
        {options.map((o, i) => (
          <button key={i} className="tv-btn" onClick={() => onDeclare(o.state)}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">{o.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TriageView({ voice, triageState, onDecide, onClose }: {
  voice: Register;
  triageState: TriageState;
  onDecide: (mode: string) => void;
  onClose: () => void;
}) {
  const t = copy.triage;
  const options = [
    { mode: 'protect_keystone', label: t.protect[voice], meta: 'keep the bare minimum', primary: true },
    { mode: 'skip_anchor',      label: t.skip[voice],    meta: 'mark anchor skipped' },
    { mode: 'recalculate',      label: t.recalc[voice],  meta: 'rebuild from now' },
  ];
  return (
    <div className="tv-prompt" role="dialog" aria-label="triage">
      <div className="tv-prompt__header">
        <div className="tv-label">triage · no rush</div>
        <button className="tv-close" onClick={onClose}>back</button>
      </div>
      <h2 className="tv-prompt__title">{t.title[voice]}</h2>
      <p className="tv-prompt__caption">{t.caption[voice]}</p>
      <div className="tv-actions">
        {options.map(o => (
          <button key={o.mode} className={`tv-btn${o.primary ? ' tv-btn--primary' : ''}`} onClick={() => onDecide(o.mode)}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">{o.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeltHelpfulView({ voice, onAnswer, onClose }: {
  voice: Register;
  onAnswer: (response: string) => void;
  onClose: () => void;
}) {
  const fh = copy.feltHelpful;
  const options = [
    { response: 'yes',        label: 'Yes, it helped.' },
    { response: 'somewhat',   label: 'Somewhat.' },
    { response: 'not_really', label: 'Not really.' },
  ];
  return (
    <div className="tv-prompt" role="dialog" aria-label="felt helpful">
      <div className="tv-prompt__header">
        <div className="tv-label">closing the day</div>
        <button className="tv-close" onClick={onClose}>back</button>
      </div>
      <h2 className="tv-prompt__title">{fh.title[voice]}</h2>
      <p className="tv-prompt__caption">{fh.caption[voice]}</p>
      <div className="tv-actions">
        {options.map(o => (
          <button key={o.response} className="tv-btn" onClick={() => onAnswer(o.response)}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">→</span>
          </button>
        ))}
      </div>
      <p className="tv-foot-note">{fh.footer[voice]}</p>
    </div>
  );
}
