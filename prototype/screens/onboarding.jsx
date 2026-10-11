// screens/onboarding.jsx — progressive 2-phase preset onboarding.
// Phase 1: mandatory before first plan. Phase 2: after first successful day.
// Every question maps to one concrete behaviour knob — no descriptive-only questions.

const PHASE1_Q = [
  {
    label: 'phase one · 1 of 5',
    title: 'What do you need this app to solve first?',
    caption: 'This sets the tone of every prompt you\u2019ll see. You can change it later in Settings.',
    options: [
      { k: 'activation', label: 'Getting started at all.', meta: 'activation' },
      { k: 'leaving',     label: 'Leaving on time.',        meta: 'lateness' },
      { k: 'panic',       label: 'Panic reduction.',        meta: 'triage tone' },
      { k: 'sleep',       label: 'Sleep regularity.',       meta: 'wake/sleep' },
    ],
  },
  {
    label: 'phase one · 2 of 5',
    title: 'What\u2019s the one thing that, if it happens, the day usually goes okay?',
    caption: 'Your keystone activity — marked with a margin dot everywhere it appears.',
    options: [
      { k: 'shower', label: 'A shower.',            meta: '~75 min ramp' },
      { k: 'meds',   label: 'Medication, on time.', meta: '~60 min ramp' },
      { k: 'out',    label: 'Getting outside.',     meta: '~90 min ramp' },
      { k: 'eat',    label: 'Eating something.',    meta: '~45 min ramp' },
    ],
  },
  {
    label: 'phase one · 3 of 5',
    title: 'Roughly what hours do you wake and sleep?',
    caption: 'Sets the window the app will ever suggest anchors inside.',
    options: [
      { k: 'early', label: '06:30 – 22:30', meta: 'early' },
      { k: 'std',   label: '08:00 – 00:00', meta: 'standard' },
      { k: 'late',  label: '11:00 – 03:00', meta: 'late / delayed phase' },
    ],
  },
  {
    label: 'phase one · 4 of 5',
    title: 'What\u2019s one place you travel to, and roughly how long does it take?',
    caption: 'Your first location travel profile — label plus total travel time. More can be added later, reused across anchors.',
    options: [
      { k: 'campus',  label: 'Campus / work · 45 min total', meta: 'label + travel' },
      { k: 'library', label: 'Library · 20 min total',       meta: 'label + travel' },
      { k: 'skip',    label: 'Skip — add this later',        meta: 'no travel profile yet', muted: true },
    ],
  },
  {
    label: 'phase one · 5 of 5',
    title: 'If a plan becomes infeasible, what should the app do?',
    caption: 'Strict lateness is the default underneath either choice — this only changes what you see.',
    options: [
      { k: 'alts',   label: 'Show alternatives.',        meta: 'reroute, softer' },
      { k: 'strict', label: 'Tell me straight, no cushioning.', meta: 'strict skip guidance' },
    ],
  },
];

const PHASE2_Q = [
  {
    label: 'phase two · 1 of 5',
    title: 'What kinds of anchors come up most, and how late is still okay?',
    caption: 'Sets per-category defaults on top of the strict baseline (0 min) you started with.',
    options: [
      { k: 'classwork', label: 'Class / work — 0 min late.',  meta: 'strict' },
      { k: 'social',     label: 'Social plans — 10 min late.', meta: 'soft' },
      { k: 'appts',      label: 'Appointments — 5 min late.',  meta: 'medium' },
    ],
  },
  {
    label: 'phase two · 2 of 5',
    title: 'Does your morning routine happen in a fixed order, or more of a cluster?',
    caption: 'Changes whether the chain enforces step order or just groups steps loosely.',
    options: [
      { k: 'fixed',  label: 'Fixed order — same steps, same sequence.', meta: 'ordered chain' },
      { k: 'flex',   label: 'Flexible cluster — steps happen, order varies.', meta: 'grouped chain' },
    ],
  },
  {
    label: 'phase two · 3 of 5',
    title: 'What has to be true right before you walk out the door?',
    caption: 'Your exit gate — the last checkpoint before every travel block.',
    options: [
      { k: 'std',  label: 'Keys, phone, meds, bag.', meta: 'standard gate' },
      { k: 'min',  label: 'Just keys and phone.',    meta: 'minimal gate' },
      { k: 'custom', label: 'Something else — set later', meta: 'skip for now', muted: true },
    ],
  },
  {
    label: 'phase two · 4 of 5',
    title: 'What counts as a good day here?',
    caption: 'This is what the app checks in on — not a score, just a definition.',
    options: [
      { k: 'binary',  label: 'Made it to the anchor. Binary.',   meta: 'attendance' },
      { k: 'partial', label: 'Made it partway. Partial counts.', meta: 'partial attendance' },
      { k: 'activation', label: 'Got moving at all. That\u2019s the bar.', meta: 'activation-only' },
    ],
  },
  {
    label: 'phase two · 5 of 5',
    title: 'How much should the app say, day to day?',
    caption: 'Prompt intensity — you can loosen or tighten this any time in Settings.',
    options: [
      { k: 'minimal',  label: 'Minimal — just the chain.',           meta: 'quiet' },
      { k: 'balanced', label: 'Balanced — chain plus check-ins.',    meta: 'default' },
      { k: 'explicit', label: 'Explicit — say the reasoning too.',   meta: 'verbose' },
    ],
  },
];

function OnboardingScreen({ navigate, tweak }) {
  const phase = tweak?.onboardingPhase === '2' ? 2 : 1;
  const questions = phase === 1 ? PHASE1_Q : PHASE2_Q;
  const [qi, setQi] = React.useState(0);
  const [intro, setIntro] = React.useState(phase === 1);

  React.useEffect(() => { setQi(0); setIntro(phase === 1); }, [phase]);

  if (intro) return <OnboardingIntro onDone={() => setIntro(false)} navigate={navigate} />;

  const q = questions[qi];
  const last = qi === questions.length - 1;
  const pick = () => {
    if (last) navigate(phase === 1 ? 'plan' : 'today');
    else setQi(i => i + 1);
  };

  return (
    <div className="tv-page tv-fade" data-screen-label={`Onboarding P${phase}`}>
      <header className="tv-head">
        <div className="tv-head__date">traverse · {phase === 1 ? 'before your first plan' : 'after your first day'}</div>
        <div className="tv-head__clock">{qi + 1} / {questions.length}</div>
      </header>

      <div className="tv-pager-dots">
        {questions.map((_, k) => <span key={k} aria-current={k === qi ? 'true' : 'false'} />)}
      </div>

      <PlanStep
        label={q.label}
        title={q.title}
        caption={q.caption}
        options={q.options}
        onPick={pick}
      />

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
    </div>
  );
}

function OnboardingIntro({ onDone, navigate }) {
  const [i, setI] = React.useState(0);
  const cards = [
    { label: 'one', title: 'This app builds backwards.', prose: 'You name one external event — a class, a shift, the cat\u2019s dinner. The app works back from that to a small chain of concrete steps. Time-blind brains find sequences easier than clock time.', ref: 'Barkley · temporal myopia' },
    { label: 'two', title: 'You decide what counts.', prose: 'No streaks. No score. Energy states aren\u2019t personality tests — they tell the chain how much room to leave you. A rest day is a complete day.', ref: 'Lewinsohn · behavioural activation' },
    { label: 'three', title: 'Five short questions, then a plan.', prose: 'Setup asks only what changes a behaviour: your keystone, your hours, one place you travel to, and how strict lateness should feel. Nothing decorative.', ref: 'progressive preset onboarding' },
  ];
  const card = cards[i];
  const last = i === cards.length - 1;
  return (
    <div className="tv-page tv-fade" data-screen-label="Onboarding Intro">
      <header className="tv-head">
        <div className="tv-head__date">traverse · first run</div>
        <div className="tv-head__clock">{i + 1} / {cards.length}</div>
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
        {cards.map((_, k) => <span key={k} aria-current={k === i ? 'true' : 'false'} />)}
      </div>
      <div className="tv-actions">
        {!last ? (
          <button className="tv-btn tv-btn--primary" onClick={() => setI(x => x + 1)}>
            <span>Continue</span><span className="tv-btn__hint">→</span>
          </button>
        ) : (
          <button className="tv-btn tv-btn--primary" onClick={onDone}>
            <span>Answer the five questions</span><span className="tv-btn__hint">→ phase one</span>
          </button>
        )}
        <button className="tv-btn tv-btn--quiet" onClick={() => navigate('empty')}>
          <span>Skip · I don't have anything fixed today</span>
          <span className="tv-btn__hint">empty</span>
        </button>
        <button className="tv-btn tv-btn--ghost" onClick={() => navigate('clinical')}>
          <span>Read the clinical reasoning</span><span className="tv-btn__hint">→</span>
        </button>
      </div>
      <p className="tv-foot-note">These five questions are the only information your account holds — no analytics, no behaviour log, nothing decorative.</p>
    </div>
  );
}

Object.assign(window, { OnboardingScreen });
