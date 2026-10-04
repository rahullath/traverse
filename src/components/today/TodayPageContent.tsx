import React, { useState, useEffect, useCallback } from 'react';
import type { MirrorData, TriageState } from '@/types/triage';
import type { TimeBlock } from '@/types/daily-plan';
import type { Register } from '@/lib/copy/voice';
import { copy } from '@/lib/copy/voice';
import { formatTime, type TimeFormat } from '@/lib/copy/time';
import { Page, Runway, Button, TimingStrip, NetworkBanner, ErrorFallback } from '@/components/tv';
import { deriveBlockState, blockEnv, isKeystoneBlock } from '@/lib/daily-plan/block-render';
import { pwaService } from '@/lib/pwa/service-worker';
import { mutate } from '@/lib/net/mutate';
import { ErrorBoundary } from '@/components/daily-plan/ErrorBoundary';

type Mode = 'loading' | 'no-plan' | 'error' | 'declare' | 'timeline' | 'triage' | 'helpful' | 'reality';

interface RealityResult {
  possible_steps: { id: string; activity_name: string; duration: number }[];
  skipped_steps: { id: string; activity_name: string; duration: number }[];
  alternatives: { id: string; label: string; description: string; estimated_duration: number }[];
  runway: number;
  required_duration: number;
  passed?: boolean;
}

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

function nextAnchorBlock(blocks: TimeBlock[], now: Date): TimeBlock | null {
  return blocks
    .filter(b => b.metadata?.role?.type === 'anchor' && b.status === 'pending' && new Date(b.startTime) > now)
    .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))[0] ?? null;
}

function anchorLabel(blocks: TimeBlock[], now: Date): string {
  const next = nextAnchorBlock(blocks, now);
  return next ? `${next.activityName}, ${formatTime(next.startTime)}` : 'anchor';
}

/** Triage and reality-check endpoints look anchors up by activityId. */
function anchorKey(block: TimeBlock): string {
  return block.activityId || block.id;
}

const INSTALL_DISMISS_KEY = 'traverse-install-dismissed-at';
const INSTALL_DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function isInstallDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(INSTALL_DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < INSTALL_DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function dismissInstall() {
  try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TodayPage(props: Props) {
  return (
    <ErrorBoundary
      fallback={(_error, reset) => (
        <Page theme={props.theme} density={props.density} motion={props.motion} active="today">
          <ErrorFallback
            message="Today hit an error while rendering. Your plan is safe on the server — nothing was lost."
            onRetry={reset}
            retryLabel="Try again"
            onSecondary={() => { window.location.reload(); }}
            secondaryLabel="Reload the page"
          />
        </Page>
      )}
    >
      <TodayPageContent {...props} />
    </ErrorBoundary>
  );
}

function TodayPageContent({ voice, theme, density, motion = true, timeFormat = 'clock' }: Props) {
  const [mode, setMode] = useState<Mode>('loading');
  const [data, setData] = useState<MirrorData | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const [reality, setReality] = useState<RealityResult | null>(null);
  const [busy, setBusy] = useState(false);

  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [actionError, setActionError] = useState<{ message: string; retry: () => void } | null>(null);

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
    const onQueueFlushed = (e: Event) => setQueuedCount((e as CustomEvent<{ remaining: number }>).detail?.remaining ?? 0);
    setInstallDismissed(isInstallDismissed());
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => { setInstalled(true); setInstallable(false); };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('offline-queue-size', onQueueSize as EventListener);
    window.addEventListener('offline-queue-flushed', onQueueFlushed as EventListener);
    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('pwa-installed', onInstalled);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('offline-queue-size', onQueueSize as EventListener);
      window.removeEventListener('offline-queue-flushed', onQueueFlushed as EventListener);
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

  const setBlockStatus = (id: string, status: TimeBlock['status']) =>
    setData(prev => prev
      ? { ...prev, time_blocks: prev.time_blocks.map(b => b.id === id ? { ...b, status } : b) }
      : prev);

  const handleDeclare = async (state: string, selectedStepId?: string) => {
    setActionError(null);
    const r = await mutate('/api/daily-plan/state', 'POST', selectedStepId ? { state, selected_step_id: selectedStepId } : { state });
    if (!r.ok) { setActionError({ message: r.message, retry: () => handleDeclare(state, selectedStepId) }); return; }
    if (!r.queued) await load();
    // Never bounce straight back into the prompt the user just answered.
    setMode(m => (m === 'declare' || m === 'loading' ? 'timeline' : m));
  };

  const handleBlockStatus = async (id: string, status: 'completed' | 'skipped') => {
    const block = data?.time_blocks.find(b => b.id === id);
    const prevStatus = block?.status ?? 'pending';
    setActionError(null);
    setBlockStatus(id, status);
    setOpenBlock(null);
    const r = await mutate(
      `/api/time-blocks/${id}/complete`,
      'PATCH',
      status === 'skipped' ? { status, skip_reason: 'user_skipped' } : { status },
      `block-${id}-${status}`,
    );
    if (!r.ok) {
      setBlockStatus(id, prevStatus);
      setActionError({
        message: `Couldn't mark “${block?.activityName ?? 'that step'}” ${status === 'completed' ? 'done' : 'skipped'}. ${r.message}`,
        retry: () => handleBlockStatus(id, status),
      });
    }
  };

  const handleComplete = (id: string) => handleBlockStatus(id, 'completed');
  const handleSkip = (id: string) => handleBlockStatus(id, 'skipped');

  const handleTriage = async (triageMode: string, anchorOverride?: TimeBlock | null) => {
    const anchor = anchorOverride ?? data?.triage_state.anchor;
    if (!anchor) { setMode('timeline'); return; }
    setActionError(null);
    const r = await mutate('/api/daily-plan/triage', 'POST', { mode: triageMode, anchor_id: anchorKey(anchor) });
    if (!r.ok) { setActionError({ message: r.message, retry: () => handleTriage(triageMode, anchorOverride) }); return; }
    if (triageMode === 'recalculate' && !r.queued) { await load(); return; }
    setMode('timeline');
  };

  const handleRecalc = async () => {
    setActionError(null);
    setBusy(true);
    const r = await mutate('/api/daily-plan/recalculate', 'POST', {});
    setBusy(false);
    if (!r.ok) { setActionError({ message: r.message, retry: handleRecalc }); return; }
    if (!r.queued) await load();
  };

  const handleRealityCheck = async () => {
    const anchor = data ? nextAnchorBlock(data.time_blocks, new Date()) : null;
    if (!anchor) return;
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/daily-plan/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anchor_id: anchorKey(anchor) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Couldn't check right now.");
      setReality({
        possible_steps: body.possible_steps ?? [],
        skipped_steps: body.skipped_steps ?? [],
        alternatives: body.alternatives ?? [],
        runway: body.runway ?? 0,
        required_duration: body.required_duration ?? 0,
        passed: body.error === 'AnchorPassedError',
      });
      setMode('reality');
    } catch (e) {
      setActionError({ message: e instanceof Error ? e.message : "Couldn't check right now.", retry: handleRealityCheck });
    } finally {
      setBusy(false);
    }
  };

  const handleRealityChoice = async (altId: string) => {
    if (altId === 'keystone_only') {
      await handleTriage('protect_keystone', data ? nextAnchorBlock(data.time_blocks, new Date()) : null);
      return;
    }
    if (altId === 'skip_all' && reality) {
      // "Skip prep, just go": skip the remaining prep steps, keep the anchor.
      setMode('timeline');
      for (const step of [...reality.possible_steps, ...reality.skipped_steps]) {
        await handleBlockStatus(step.id, 'skipped');
      }
      return;
    }
    setMode('timeline');
  };

  const handleFeltHelpful = async (response: string) => {
    // Best-effort: the day-close signal must never block leaving the screen.
    await mutate('/api/analytics/felt-helpful', 'POST', { response, date: new Date().toISOString().split('T')[0] });
    // Marks phase-2 onboarding presets as eligible to surface once, next visit.
    await mutate('/api/auth/preferences', 'PUT', { phase2_eligible_at: new Date().toISOString() });
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
      {online && queuedCount === 0 && installable && !installed && !installDismissed && (
        <NetworkBanner
          variant="install"
          onInstall={() => pwaService.promptInstall()}
          onDismiss={() => { dismissInstall(); setInstallDismissed(true); }}
        />
      )}

      {actionError && (
        <div className="tv-card tv-card--quote" role="alert">
          <div className="tv-label">not saved</div>
          <p className="tv-prose" style={{ margin: 0 }}>{actionError.message}</p>
          <div className="tv-actions">
            <button className="tv-btn tv-btn--ghost" onClick={() => { const retry = actionError.retry; setActionError(null); retry(); }}>
              <span>Try again</span><span className="tv-btn__hint">retry</span>
            </button>
            <button className="tv-close" onClick={() => setActionError(null)}>dismiss</button>
          </div>
        </div>
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
        <StateDeclaration
          voice={v}
          steps={(data?.time_blocks ?? []).filter(b => b.status === 'pending' && b.metadata?.role?.type !== 'anchor')}
          timeFormat={timeFormat}
          onDeclare={handleDeclare}
          onClose={() => setMode('timeline')}
        />
      )}

      {mode === 'reality' && reality && (
        <RealityCheckView voice={v} result={reality} onChoose={handleRealityChoice} onClose={() => setMode('timeline')} />
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
              {nextAnchorBlock(data.time_blocks, clock) && (
                <Button variant="quiet" hint={busy ? '…' : 'fit'} onClick={() => { if (!busy) handleRealityCheck(); }}>
                  {copy.realityCheck.openButton[v]}
                </Button>
              )}
              <Button variant="quiet" hint="state" onClick={() => setMode('declare')}>
                {copy.declareButton[v]}
              </Button>
              <Button variant="quiet" hint={busy ? '…' : 'now'} onClick={() => { if (!busy) handleRecalc(); }}>
                {copy.recalcButton[v]}
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
        <TriageView voice={v} triageState={data.triage_state} onDecide={(m) => handleTriage(m)} onClose={() => setMode('timeline')} />
      )}

      {mode === 'helpful' && (
        <FeltHelpfulView voice={v} onAnswer={handleFeltHelpful} onClose={() => setMode('timeline')} />
      )}

    </Page>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const DECLARABLE_STATES = ['starting_day', 'ready_for_anchor', 'mid_chain', 'at_anchor', 'missed_it', 'just_checking'] as const;

function StateDeclaration({ voice, steps, timeFormat, onDeclare, onClose }: {
  voice: Register;
  steps: TimeBlock[];
  timeFormat: TimeFormat;
  onDeclare: (state: string, selectedStepId?: string) => void;
  onClose: () => void;
}) {
  const sd = copy.stateDeclaration;
  const [pickingStep, setPickingStep] = useState(false);
  return (
    <div className="tv-prompt" role="dialog" aria-label="state declaration">
      <div className="tv-prompt__header">
        <div className="tv-label">state · for chain padding only</div>
        <button className="tv-close" onClick={pickingStep ? () => setPickingStep(false) : onClose}>{pickingStep ? 'back' : 'close'}</button>
      </div>
      <h2 className="tv-prompt__title">{pickingStep ? sd.stepPicker[voice] : sd.title[voice]}</h2>
      {!pickingStep && <p className="tv-prompt__caption">{sd.caption[voice]}</p>}
      <div className="tv-actions">
        {pickingStep
          ? steps.map(step => (
              <button key={step.id} className="tv-btn" onClick={() => onDeclare('mid_chain', step.id)}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{step.activityName}</span>
                <span className="tv-btn__hint">{formatTime(step.startTime, timeFormat)}</span>
              </button>
            ))
          : DECLARABLE_STATES
              .filter(state => state !== 'mid_chain' || steps.length > 0)
              .map(state => (
                <button
                  key={state}
                  className="tv-btn"
                  onClick={() => (state === 'mid_chain' ? setPickingStep(true) : onDeclare(state))}
                >
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{sd.options[state][voice]}</span>
                  <span className="tv-btn__hint">{state === 'mid_chain' ? 'pick step →' : state.replace(/_/g, ' ')}</span>
                </button>
              ))}
      </div>
    </div>
  );
}

function RealityCheckView({ voice, result, onChoose, onClose }: {
  voice: Register;
  result: RealityResult;
  onChoose: (alternativeId: string) => void;
  onClose: () => void;
}) {
  const rc = copy.realityCheck;
  return (
    <div className="tv-prompt" role="dialog" aria-label="reality check">
      <div className="tv-prompt__header">
        <div className="tv-label">reality check · {result.runway} min runway</div>
        <button className="tv-close" onClick={onClose}>back</button>
      </div>
      {result.passed ? (
        <p className="tv-prompt__caption">{rc.passed[voice]}</p>
      ) : (
        <>
          <h2 className="tv-prompt__title">{rc.title[voice]}</h2>
          {result.possible_steps.length === 0 ? (
            <p className="tv-prompt__caption">{rc.noRoom[voice]}</p>
          ) : (
            <section>
              <div className="tv-label">{rc.fitsLabel[voice]}</div>
              {result.possible_steps.map(s => (
                <p key={s.id} className="tv-prose" style={{ margin: '2px 0' }}>{s.activity_name} <span className="tv-ui-s">· {s.duration} min</span></p>
              ))}
            </section>
          )}
          {result.skipped_steps.length > 0 && (
            <section style={{ marginTop: 8 }}>
              <div className="tv-label">{rc.droppedLabel[voice]}</div>
              {result.skipped_steps.map(s => (
                <p key={s.id} className="tv-prose" style={{ margin: '2px 0', color: 'var(--ink-mute)' }}>{s.activity_name} <span className="tv-ui-s">· {s.duration} min</span></p>
              ))}
            </section>
          )}
          <div className="tv-actions">
            {result.alternatives.map(alt => (
              <button key={alt.id} className={`tv-btn${alt.id === 'keystone_only' ? ' tv-btn--primary' : ''}`} onClick={() => onChoose(alt.id)}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{alt.label}</span>
                <span className="tv-btn__hint">{alt.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
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
