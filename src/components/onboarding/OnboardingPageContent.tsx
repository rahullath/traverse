import React, { useState } from 'react';
import { Page, Button } from '@/components/tv';

interface Option {
  k: string;
  label: string;
  meta: string;
  muted?: boolean;
}

interface Question {
  label: string;
  title: string;
  caption: string;
  options: Option[];
}

const PHASE1_Q: Question[] = [
  {
    label: 'phase one · 1 of 5',
    title: 'What do you need this app to solve first?',
    caption: 'This sets the tone of every prompt you’ll see. You can change it later in Settings.',
    options: [
      { k: 'activation', label: 'Getting started at all.', meta: 'activation' },
      { k: 'leaving', label: 'Leaving on time.', meta: 'lateness' },
      { k: 'panic', label: 'Panic reduction.', meta: 'triage tone' },
      { k: 'sleep', label: 'Sleep regularity.', meta: 'wake/sleep' },
    ],
  },
  {
    label: 'phase one · 2 of 5',
    title: 'What’s the one thing that, if it happens, the day usually goes okay?',
    caption: 'Your keystone activity — marked with a margin dot everywhere it appears.',
    options: [
      { k: 'shower', label: 'A shower.', meta: '~75 min ramp' },
      { k: 'meds', label: 'Medication, on time.', meta: '~60 min ramp' },
      { k: 'out', label: 'Getting outside.', meta: '~90 min ramp' },
      { k: 'eat', label: 'Eating something.', meta: '~45 min ramp' },
    ],
  },
  {
    label: 'phase one · 3 of 5',
    title: 'Roughly what hours do you wake and sleep?',
    caption: 'Sets the window the app will ever suggest anchors inside.',
    options: [
      { k: 'early', label: '06:30 – 22:30', meta: 'early' },
      { k: 'std', label: '08:00 – 00:00', meta: 'standard' },
      { k: 'late', label: '11:00 – 03:00', meta: 'late / delayed phase' },
    ],
  },
  {
    label: 'phase one · 4 of 5',
    title: 'What’s one place you travel to, and roughly how long does it take?',
    caption: 'Your first location travel profile — label plus total travel time. More can be added later, reused across anchors.',
    options: [
      { k: 'campus', label: 'Campus / work · 45 min total', meta: 'label + travel' },
      { k: 'library', label: 'Library · 20 min total', meta: 'label + travel' },
      { k: 'skip', label: 'Skip — add this later', meta: 'no travel profile yet', muted: true },
    ],
  },
  {
    label: 'phase one · 5 of 5',
    title: 'If a plan becomes infeasible, what should the app do?',
    caption: 'Strict lateness is the default underneath either choice — this only changes what you see.',
    options: [
      { k: 'alts', label: 'Show alternatives.', meta: 'reroute, softer' },
      { k: 'strict', label: 'Tell me straight, no cushioning.', meta: 'strict skip guidance' },
    ],
  },
];

const PHASE2_Q: Question[] = [
  {
    label: 'phase two · 1 of 5',
    title: 'What kinds of anchors come up most, and how late is still okay?',
    caption: 'Sets per-category defaults on top of the strict baseline (0 min) you started with.',
    options: [
      { k: 'classwork', label: 'Class / work — 0 min late.', meta: 'strict' },
      { k: 'social', label: 'Social plans — 10 min late.', meta: 'soft' },
      { k: 'appts', label: 'Appointments — 5 min late.', meta: 'medium' },
    ],
  },
  {
    label: 'phase two · 2 of 5',
    title: 'Does your morning routine happen in a fixed order, or more of a cluster?',
    caption: 'Changes whether the chain enforces step order or just groups steps loosely.',
    options: [
      { k: 'fixed', label: 'Fixed order — same steps, same sequence.', meta: 'ordered chain' },
      { k: 'flex', label: 'Flexible cluster — steps happen, order varies.', meta: 'grouped chain' },
    ],
  },
  {
    label: 'phase two · 3 of 5',
    title: 'What has to be true right before you walk out the door?',
    caption: 'Your exit gate — the last checkpoint before every travel block.',
    options: [
      { k: 'std', label: 'Keys, phone, meds, bag.', meta: 'standard gate' },
      { k: 'min', label: 'Just keys and phone.', meta: 'minimal gate' },
      { k: 'custom', label: 'Something else — set later', meta: 'skip for now', muted: true },
    ],
  },
  {
    label: 'phase two · 4 of 5',
    title: 'What counts as a good day here?',
    caption: 'This is what the app checks in on — not a score, just a definition.',
    options: [
      { k: 'binary', label: 'Made it to the anchor. Binary.', meta: 'attendance' },
      { k: 'partial', label: 'Made it partway. Partial counts.', meta: 'partial attendance' },
      { k: 'activation', label: 'Got moving at all. That’s the bar.', meta: 'activation-only' },
    ],
  },
  {
    label: 'phase two · 5 of 5',
    title: 'How much should the app say, day to day?',
    caption: 'Prompt intensity — you can loosen or tighten this any time in Settings.',
    options: [
      { k: 'minimal', label: 'Minimal — just the chain.', meta: 'quiet' },
      { k: 'balanced', label: 'Balanced — chain plus check-ins.', meta: 'default' },
      { k: 'explicit', label: 'Explicit — say the reasoning too.', meta: 'verbose' },
    ],
  },
];

const INTRO_CARDS = [
  { label: 'one', title: 'This app builds backwards.', prose: 'You name one external event — a class, a shift, the cat’s dinner. The app works back from that to a small chain of concrete steps. Time-blind brains find sequences easier than clock time.', ref: 'Barkley · temporal myopia' },
  { label: 'two', title: 'You decide what counts.', prose: 'No streaks. No score. Energy states aren’t personality tests — they tell the chain how much room to leave you. A rest day is a complete day.', ref: 'Lewinsohn · behavioural activation' },
  { label: 'three', title: 'Five short questions, then a plan.', prose: 'Setup asks only what changes a behaviour: your keystone, your hours, one place you travel to, and how strict lateness should feel. Nothing decorative.', ref: 'progressive preset onboarding' },
];

function wakeSleepFromBucket(k: string): { wake_window_start: string; sleep_window_end: string } {
  if (k === 'early') return { wake_window_start: '06:30', sleep_window_end: '22:30' };
  if (k === 'late') return { wake_window_start: '11:00', sleep_window_end: '03:00' };
  return { wake_window_start: '08:00', sleep_window_end: '00:00' };
}

function travelFromBucket(k: string): { first_location_label?: string; first_location_travel_minutes?: number } {
  if (k === 'campus') return { first_location_label: 'Campus / work', first_location_travel_minutes: 45 };
  if (k === 'library') return { first_location_label: 'Library', first_location_travel_minutes: 20 };
  return {};
}

function latenessFromBucket(k: string): Record<string, number> {
  const base = { class: 0, social: 10, appointment: 5 };
  if (k === 'classwork') return { ...base, class: 0 };
  if (k === 'social') return { ...base, social: 10 };
  if (k === 'appts') return { ...base, appointment: 5 };
  return base;
}

function exitGateFromBucket(k: string): string[] {
  if (k === 'std') return ['keys', 'phone', 'meds', 'bag'];
  if (k === 'min') return ['keys', 'phone'];
  return [];
}

export interface Props {
  initialPhase: 1 | 2;
  showIntro: boolean;
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
  motion?: boolean;
}

export default function OnboardingPageContent({ initialPhase, showIntro, theme, density, motion = true }: Props) {
  const [stage, setStage] = useState<'intro' | 'questions'>(showIntro ? 'intro' : 'questions');
  const [introIndex, setIntroIndex] = useState(0);
  const [qi, setQi] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [phase1Answers, setPhase1Answers] = useState<Record<string, string>>({});
  const [phase2Answers, setPhase2Answers] = useState<Record<string, string>>({});

  const phase = initialPhase;
  const questions = phase === 1 ? PHASE1_Q : PHASE2_Q;
  const q = questions[qi];
  const last = qi === questions.length - 1;

  const submitPhase1 = async (answers: Record<string, string>) => {
    setSubmitting(true);
    const wakeSleep = wakeSleepFromBucket(answers.wake_sleep ?? 'std');
    const travel = travelFromBucket(answers.place ?? 'skip');
    const body = {
      primary_goal: answers.goal ?? null,
      keystone_activity: PHASE1_Q[1].options.find(o => o.k === answers.keystone)?.label ?? null,
      wake_window_start: wakeSleep.wake_window_start,
      sleep_window_end: wakeSleep.sleep_window_end,
      infeasible_response: answers.infeasible === 'strict' ? 'strict_skip' : 'alternatives',
      ...travel,
    };
    await fetch('/api/user/complete-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
    window.location.href = '/plan';
  };

  const submitPhase2 = async (answers: Record<string, string>) => {
    setSubmitting(true);
    const successMode = answers.success === 'partial' ? 'partial_attendance' : answers.success === 'activation' ? 'activation_only' : 'attendance';
    const body = {
      phase: 2,
      answers: {
        anchor_category_lateness: latenessFromBucket(answers.lateness ?? 'classwork'),
        routine_order_mode: answers.routine === 'flex' ? 'flexible' : 'fixed',
        exit_gate_items: exitGateFromBucket(answers.gate ?? 'std'),
        success_mode: successMode,
        prompt_intensity: answers.intensity ?? 'balanced',
      },
    };
    await fetch('/api/onboarding/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
    window.location.href = '/today';
  };

  const pickAnswerKey = (): string => {
    const keys = phase === 1
      ? ['goal', 'keystone', 'wake_sleep', 'place', 'infeasible']
      : ['lateness', 'routine', 'gate', 'success', 'intensity'];
    return keys[qi];
  };

  const handlePick = (o: Option) => {
    const key = pickAnswerKey();
    if (phase === 1) {
      const next = { ...phase1Answers, [key]: o.k };
      setPhase1Answers(next);
      if (last) { submitPhase1(next); return; }
    } else {
      const next = { ...phase2Answers, [key]: o.k };
      setPhase2Answers(next);
      if (last) { submitPhase2(next); return; }
    }
    setQi(i => i + 1);
  };

  if (stage === 'intro') {
    const card = INTRO_CARDS[introIndex];
    const introLast = introIndex === INTRO_CARDS.length - 1;
    return (
      <Page theme={theme} density={density} motion={motion}>
        <header className="tv-head">
          <div className="tv-head__date">traverse · first run</div>
          <div className="tv-head__clock">{introIndex + 1} / {INTRO_CARDS.length}</div>
        </header>
        <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="tv-label">{card.label}</div>
          <h1 className="tv-display" style={{ fontSize: 32 }}>{card.title}</h1>
          <p className="tv-prose">{card.prose}</p>
          <p className="tv-foot-note" style={{ textAlign: 'left', paddingTop: 8 }}>
            — <span style={{ fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: 11, letterSpacing: '0.06em' }}>{card.ref}</span>
          </p>
        </div>
        <div className="tv-pager-dots">
          {INTRO_CARDS.map((_, k) => <span key={k} aria-current={k === introIndex ? 'true' : 'false'} />)}
        </div>
        <div className="tv-actions">
          {!introLast ? (
            <Button variant="primary" hint="→" onClick={() => setIntroIndex(i => i + 1)}>Continue</Button>
          ) : (
            <Button variant="primary" hint="→ phase one" onClick={() => setStage('questions')}>Answer the five questions</Button>
          )}
          <Button variant="quiet" hint="empty" onClick={() => { window.location.href = '/plan'; }}>
            Skip · I don't have anything fixed today
          </Button>
          <Button variant="ghost" hint="→" onClick={() => { window.location.href = '/clinical'; }}>
            Read the clinical reasoning
          </Button>
        </div>
        <p className="tv-foot-note">These five questions are the only information your account holds — no analytics, no behaviour log, nothing decorative.</p>
      </Page>
    );
  }

  return (
    <Page theme={theme} density={density} motion={motion}>
      <header className="tv-head">
        <div className="tv-head__date">traverse · {phase === 1 ? 'before your first plan' : 'after your first day'}</div>
        <div className="tv-head__clock">{qi + 1} / {questions.length}</div>
      </header>

      <div className="tv-pager-dots">
        {questions.map((_, k) => <span key={k} aria-current={k === qi ? 'true' : 'false'} />)}
      </div>

      <div className="tv-prompt" style={{ borderTop: 'none', paddingTop: 0 }}>
        <div className="tv-label">{q.label}</div>
        <h2 className="tv-prompt__title" style={{ fontSize: 26 }}>{q.title}</h2>
        <p className="tv-prompt__caption">{q.caption}</p>
        <div className="tv-actions">
          {q.options.map(o => (
            <button key={o.k} className={`tv-btn ${o.muted ? 'tv-btn--quiet' : ''}`} disabled={submitting} onClick={() => handlePick(o)}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
              <span className="tv-btn__hint">{o.meta}</span>
            </button>
          ))}
        </div>
      </div>

      {qi > 0 && (
        <button className="tv-btn tv-btn--ghost" onClick={() => setQi(i => Math.max(0, i - 1))}>
          <span>← back one</span>
        </button>
      )}

      <p className="tv-foot-note">
        {phase === 1
          ? 'Every question here maps to one behaviour in the planner — nothing is asked just to be asked.'
          : 'Phase two only. This surfaces once, right after your first plan finishes for real.'}
      </p>
    </Page>
  );
}
