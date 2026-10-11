// screens/plan.jsx — Plan generator / Chain view (backward-from-anchor).
// Single linear flow: anchor → minimum-viable-state → backward chain → output.

function PlanScreen({ navigate, tweak }) {
  const [step, setStep] = React.useState(0);
  const [anchor, setAnchor] = React.useState({ name: 'Linguistics lecture', time: '11:00', kind: 'class' });
  const [state, setState] = React.useState('washed and dressed');
  const [energy, setEnergy] = React.useState('foggy');
  const [travel, setTravel] = React.useState({ label: 'Home \u2192 King\u2019s (campus)', total: 45, maxLate: 0 });

  const STEPS = 5;
  const next = () => setStep(s => Math.min(s + 1, STEPS - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="tv-page tv-fade" data-screen-label="Plan">
      <header className="tv-head">
        <div className="tv-head__date">build a chain</div>
        <div className="tv-head__clock">step {step + 1} of {STEPS}</div>
      </header>

      {step === 0 && (
        <PlanStep
          label="anchor · one external event"
          title="What is one external thing in the next 2–8 hours?"
          caption="A class, a shift, a friend coming over, the sunset, the cat's dinner. Anything that happens whether you act or not."
          options={[
            { k: 'class',      label: 'Linguistics lecture · 11:00',  meta: 'class · King\u2019s 2.04' },
            { k: 'meet',       label: 'Tea with M · 14:30',           meta: 'social · their place' },
            { k: 'shift',      label: 'Library shift · 16:00',        meta: 'work · 4h' },
            { k: 'env',        label: 'Sunset · ~20:10',              meta: 'environmental · soft anchor' },
            { k: 'none',       label: 'I don\u2019t have one today',  meta: 'go to anchor-less', muted: true },
          ]}
          onPick={(o) => { if (o.k === 'none') navigate('empty'); else next(); }}
        />
      )}

      {step === 1 && (
        <PlanStep
          label="state · minimum viable"
          title="What do you need to be, just before that?"
          caption="Behavioural activation in one sentence: act first, mood follows. Pick the smallest version that still counts."
          options={[
            { k: 'washed',  label: 'Washed and dressed.',          meta: 'standard' },
            { k: 'fed',     label: 'Have eaten something.',        meta: 'one meal counts' },
            { k: 'outside', label: 'Already outside the flat.',    meta: 'biggest threshold first' },
            { k: 'braced',  label: 'Emotionally braced. Not in bed.', meta: 'low day' },
          ]}
          onPick={() => next()}
        />
      )}

      {step === 2 && (
        <PlanStep
          label="ramp · how much time you need"
          title="And how is the energy?"
          caption="This sets how much room the chain leaves you. Not a personality test."
          options={[
            { k: 'high',   label: 'Clear and ready.',           meta: '75 min ramp' },
            { k: 'med',    label: 'A bit foggy.',                meta: '90 min ramp' },
            { k: 'low',    label: 'Running on empty.',           meta: '120 min · rest valid' },
          ]}
          onPick={() => next()}
        />
      )}

      {step === 3 && (
        <PlanStep
          label="travel · reusable location profile"
          title="How do you get there, and how long does it take?"
          caption="Pick a saved profile, or add a new one later in Settings → Travel. Home and same-location anchors skip this."
          options={[
            { k: 'campus',  label: 'Home \u2192 King\u2019s (campus)', meta: '45 min · strict' },
            { k: 'library', label: 'Home \u2192 Library',              meta: '20 min · 5min late ok' },
            { k: 'same',    label: 'Same location \u2014 no travel',   meta: '0 min · no block' },
          ]}
          onPick={(o) => { setTravel({ label: o.label, total: o.k === 'campus' ? 45 : o.k === 'library' ? 20 : 0, maxLate: o.k === 'library' ? 5 : 0 }); next(); }}
        />
      )}

      {step === 4 && (
        <PlanResult
          anchor={anchor}
          state={state}
          energy={energy}
          travel={travel}
          onOpen={() => navigate('today')}
          onBack={back}
        />
      )}

      {step > 0 && step < 4 && (
        <button className="tv-btn tv-btn--ghost" onClick={back}>
          <span>← back one step</span>
          <span className="tv-btn__hint" />
        </button>
      )}
    </div>
  );
}

function PlanStep({ label, title, caption, options, onPick }) {
  return (
    <div className="tv-prompt" style={{ borderTop: 'none', paddingTop: 0 }}>
      <div className="tv-label">{label}</div>
      <h2 className="tv-prompt__title" style={{ fontSize: 26 }}>{title}</h2>
      <p className="tv-prompt__caption">{caption}</p>
      <div className="tv-actions">
        {options.map(o => (
          <button
            key={o.k}
            className={`tv-btn ${o.muted ? 'tv-btn--quiet' : ''}`}
            onClick={() => onPick(o)}
          >
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">{o.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanResult({ anchor, state, energy, travel, onOpen, onBack }) {
  // Computed chain (deterministic for demo). Travel blocks suppressed for same-location.
  const base = [
    { t: '09:30', n: 'Wake — open the curtains',          e: 'wake ramp', keystone: false },
    { t: '09:40', n: 'Shower',                             e: 'wake ramp', keystone: true },
    { t: '10:00', n: 'Medication, glass of water',         e: 'wake ramp', keystone: true },
    { t: '10:10', n: 'Dress and pack bag',                 e: 'prep',      keystone: false },
    { t: '10:25', n: 'Exit gate · keys, phone, meds, bag', e: 'prep',      keystone: false, gate: true },
  ];
  const travelBlocks = travel?.total > 0 ? [
    { t: '10:30', n: `Walk / transit \u2014 ${travel.label}`, e: 'travel', keystone: false },
  ] : [];
  const chain = [
    ...base,
    ...travelBlocks,
    { t: '11:00', n: `${anchor.name} · ${anchor.time}`,    e: 'anchor',    keystone: false, anchor: true },
  ];

  const effectiveDeadline = travel ? addMinutes(anchor.time, travel.maxLate) : anchor.time;

  return (
    <div className="tv-prompt" style={{ borderTop: 'none', paddingTop: 0 }}>
      <div className="tv-label">chain · written down</div>
      <h2 className="tv-prompt__title" style={{ fontSize: 26 }}>
        Here is your morning. <em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>Copy it down if you like.</em>
      </h2>

      <div className="tv-timing">
        <div className="tv-timing__item">
          <span className="tv-timing__label">start by</span>
          <span className="tv-timing__val">09:30</span>
        </div>
        <div className="tv-timing__item tv-timing__item--leave">
          <span className="tv-timing__label">leave by</span>
          <span className="tv-timing__val">{travel?.total > 0 ? '10:30' : '\u2014'}</span>
        </div>
        <div className="tv-timing__item">
          <span className="tv-timing__label">anchor at</span>
          <span className="tv-timing__val">{anchor.time}</span>
        </div>
      </div>
      <p className="tv-timing__note">
        {travel?.total > 0
          ? `${travel.label} · ${travel.total} min travel · effective deadline ${effectiveDeadline} (max late ${travel.maxLate}min)`
          : 'Same location — no travel block, no leave-by needed.'}
      </p>

      <section style={{ display: 'flex', flexDirection: 'column' }}>
        {chain.map((b, i) => (
          <article key={i} className={`tv-block ${b.keystone ? 'tv-block--keystone' : ''}`}>
            <div className="tv-block__time">{b.t}</div>
            <div className="tv-block__gutter">{b.anchor ? '◇' : b.gate ? '⊓' : b.keystone ? '·' : ' '}</div>
            <div className="tv-block__body">
              <div className="tv-block__name" style={b.anchor ? { fontStyle: 'italic' } : null}>{b.n}</div>
              <div className="tv-block__meta">{b.e}{b.keystone && '  ·  keystone'}{b.gate && '  ·  exit gate'}</div>
            </div>
          </article>
        ))}
      </section>

      <div className="tv-card tv-card--quote">
        <div className="tv-label">implementation intention</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          <em>When the curtains are open, I will get in the shower.</em> The rest follows from that one if-then.
        </p>
      </div>

      <div className="tv-actions">
        <button className="tv-btn tv-btn--primary" onClick={onOpen}>
          <span>Open this in Today</span>
          <span className="tv-btn__hint">→ live</span>
        </button>
        <button className="tv-btn" onClick={onBack}>
          <span>Change something</span>
          <span className="tv-btn__hint">back</span>
        </button>
      </div>

      <p className="tv-foot-note">
        Screenshot this. The app does not need to remember it for you — and won\u2019t, unless you sign in.
      </p>
    </div>
  );
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m + mins);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

Object.assign(window, { PlanScreen, PlanStep });
