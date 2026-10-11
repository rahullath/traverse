// screens/today.jsx — the Mirror redesign. Paper-and-ink runtime view.
// State: pre-state-declaration → timeline → triage → felt-helpful.

function TodayScreen({ tweak, navigate }) {
  const [mode, setMode] = React.useState('timeline');
  // mode: 'declare' | 'timeline' | 'triage' | 'helpful'

  // Open Today in "declare" once per session for demo realism
  React.useEffect(() => {
    if (tweak.openWith) setMode(tweak.openWith);
  }, [tweak.openWith]);

  const now = '09:34';
  const date = 'Wed · 20 May';

  // The chain — backwards from a single anchor (lecture 11:00).
  // Past, now, future markers are computed against `now`.
  const blocks = [
    { t: '07:30', name: 'Wake — open the curtains',           env: 'wake ramp',    state: 'past',     mark: '×' },
    { t: '07:45', name: 'Toilet',                              env: 'wake ramp',    state: 'past',     mark: '×' },
    { t: '08:00', name: 'Shower',                              env: 'wake ramp',    state: 'past',     mark: '·', keystone: true, note: 'kept the rhythm' },
    { t: '08:30', name: 'Medication, glass of water',          env: 'wake ramp',    state: 'past',     mark: '·', keystone: true },
    { t: '08:45', name: 'Toast and tea, sit at the table',     env: 'prep',         state: 'past',     mark: '×' },
    { t: '09:15', name: 'Dress · pack bag · keys, phone',      env: 'prep · exit',  state: 'now',      mark: '›' },
    { t: '09:50', name: 'Walk to the bus stop',                env: 'travel',       state: 'next',     mark: '  ' },
    { t: '10:15', name: 'Bus 25 toward campus',                env: 'travel',       state: 'future',   mark: '  ' },
    { t: '11:00', name: 'Linguistics lecture · King\'s 2.04',  env: 'anchor',       state: 'future',   mark: '  ', anchor: true },
    { t: '12:30', name: 'Walk back, easy pace',                env: 'travel · back',state: 'future',   mark: '  ' },
    { t: '13:00', name: 'Lie down · do nothing',               env: 'recovery',     state: 'future',   mark: '  ' },
  ];

  const runwayMin = 21;
  const requiredMin = 35;
  const overdue = runwayMin < requiredMin;
  const maxLate = tweak.maxLateMinutes ?? 0;

  // Voice-register copy. Three registers per the user's spec.
  const voice = (k) => COPY[tweak.voice]?.[k] ?? COPY.plain[k];

  const hasError = tweak.todayError;

  return (
    <div className="tv-page tv-fade" data-screen-label="Today" data-wide="true">
      <header className="tv-head">
        <div className="tv-head__date">{date}</div>
        <div className="tv-head__clock">{now}</div>
      </header>

      <NetworkBanners tweak={tweak} />

      {/* The view name candidates — proposed in the design, default Today.
          Visible only in onboarding-style flow; tweak controls which is shown. */}
      <TodayNameBanner tweak={tweak} />

      {hasError ? (
        <TodayErrorFallback navigate={navigate} />
      ) : (
      <>
      <RunwayReadout
        minutes={runwayMin}
        required={requiredMin}
        overdue={overdue}
        anchor="lecture, 11:00"
        format={tweak.timeFormat}
      />

      <TimingStrip anchorTime="11:00" leaveBy="09:50" startBy="09:15" maxLate={maxLate} runwayMin={runwayMin} requiredMin={requiredMin} />

      <div className="tv-splitrow">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {mode === 'declare' && (
        <StateDeclaration
          onClose={() => setMode('timeline')}
          voiceCopy={voice}
        />
      )}

      {mode === 'timeline' && (
        <>
          <Timeline blocks={blocks} now={now} keystoneMark={tweak.keystoneMark} />

          {overdue && (
            <div className="tv-card tv-card--quote">
              <div className="tv-label">time physics</div>
              <p className="tv-prose" style={{ margin: 0 }}>
                {voice('triageNudge')}
              </p>
              <button className="tv-btn tv-btn--ghost" onClick={() => setMode('triage')}>
                <span>{voice('triageOpen')}</span>
                <span className="tv-btn__hint">→</span>
              </button>
            </div>
          )}

          <div className="tv-actions" style={{ marginTop: 8 }}>
            <button className="tv-btn tv-btn--quiet" onClick={() => setMode('declare')}>
              <span>{voice('declareOpen')}</span>
              <span className="tv-btn__hint">state</span>
            </button>
            <button className="tv-btn tv-btn--quiet" onClick={() => setMode('helpful')}>
              <span>End the day in the app</span>
              <span className="tv-btn__hint">close</span>
            </button>
          </div>

          <p className="tv-foot-note">
            {voice('footer')}
          </p>
        </>
      )}

      {mode === 'triage' && (
        <TriagePrompt
          onClose={() => setMode('timeline')}
          voiceCopy={voice}
        />
      )}

      {mode === 'helpful' && (
        <FeltHelpfulPrompt
          onClose={() => navigate('today-fresh')}
          voiceCopy={voice}
        />
      )}
      </div>

      <aside className="tv-rail">
        <div className="tv-card">
          <div className="tv-label">travel · leave-by rail</div>
          <p className="tv-prose" style={{ margin: 0, fontSize: 14 }}>
            Home → King's (campus) · 45 min total. Leave by <strong>09:50</strong> for the 09:50 walk + bus 25.
          </p>
        </div>
        <div className="tv-card tv-card--quote">
          <div className="tv-label">effective deadline</div>
          <p className="tv-prose" style={{ margin: 0, fontSize: 14 }}>
            Anchor 11:00, max late {maxLate}min → effective arrival deadline <strong>{addMinutesLocal('11:00', maxLate)}</strong>.
          </p>
        </div>
      </aside>
      </div>
      </>
      )}
    </div>
  );
}

function addMinutesLocal(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m + mins);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function TimingStrip({ anchorTime, leaveBy, startBy, maxLate, runwayMin, requiredMin }) {
  const late = runwayMin < requiredMin;
  const overBy = requiredMin - runwayMin;
  return (
    <>
      <div className="tv-timing">
        <div className="tv-timing__item">
          <span className="tv-timing__label">start by</span>
          <span className="tv-timing__val">{startBy}</span>
        </div>
        <div className="tv-timing__item tv-timing__item--leave">
          <span className="tv-timing__label">leave by</span>
          <span className="tv-timing__val">{leaveBy}</span>
        </div>
        <div className="tv-timing__item">
          <span className="tv-timing__label">anchor at</span>
          <span className="tv-timing__val">{anchorTime}</span>
        </div>
      </div>
      <div className={`tv-lateness ${late ? 'tv-lateness--late' : 'tv-lateness--ontrack'}`}>
        {late
          ? `likely late by ~${overBy}min · max late ${maxLate}min · next feasible departure 10:05`
          : `on track · strict max late ${maxLate}min`}
      </div>
    </>
  );
}

function NetworkBanners({ tweak }) {
  const net = tweak.network || 'online';
  const install = tweak.installState || 'promptable';
  return (
    <>
      {net === 'offline' && (
        <div className="tv-banner tv-banner--offline">
          <span className="tv-banner__dot" />
          <div className="tv-banner__text">
            <span className="tv-banner__title">Offline</span>
            <span className="tv-banner__sub">Showing the last synced chain. Completions and edits are queued, not lost.</span>
          </div>
        </div>
      )}
      {net === 'flaky' && (
        <div className="tv-banner tv-banner--queued">
          <span className="tv-banner__dot" />
          <div className="tv-banner__text">
            <span className="tv-banner__title">Reconnecting — 2 actions queued</span>
            <span className="tv-banner__sub">Complete/skip/edit keep working offline and retry automatically.</span>
          </div>
        </div>
      )}
      {net === 'online' && install === 'promptable' && (
        <div className="tv-banner tv-banner--install">
          <span className="tv-banner__dot" />
          <div className="tv-banner__text">
            <span className="tv-banner__title">Install traverse</span>
            <span className="tv-banner__sub">Works offline, opens instantly, no app store.</span>
          </div>
          <button className="tv-banner__action">Install</button>
        </div>
      )}
    </>
  );
}

function TodayErrorFallback({ navigate }) {
  return (
    <div className="tv-error">
      <div className="tv-label">something went wrong</div>
      <p className="tv-prose" style={{ margin: 0 }}>
        The Mirror hit an error rendering today's chain. Your plan is safe — it's not stored here, and nothing was lost.
      </p>
      <div className="tv-actions">
        <button className="tv-btn tv-btn--primary" onClick={() => navigate('today-fresh')}>
          <span>Reload today</span><span className="tv-btn__hint">retry</span>
        </button>
        <button className="tv-btn tv-btn--ghost" onClick={() => navigate('plan')}>
          <span>Build a new chain instead</span>
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function TodayNameBanner({ tweak }) {
  if (!tweak.showNameBanner) return null;
  const names = ['Today', 'Now', 'Runway', 'The Hours'];
  return (
    <div style={{
      borderTop: '1px solid var(--rule)',
      borderBottom: '1px solid var(--rule)',
      padding: '10px 0',
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 12,
    }}>
      <div className="tv-label">view name · pick one</div>
      <div className="tv-namepick">
        {names.map(n => (
          <button key={n} aria-pressed={n === tweak.viewName}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function RunwayReadout({ minutes, required, overdue, anchor, format }) {
  if (format === 'chunks') {
    return (
      <section className="tv-runway">
        <div className="tv-label">runway · {anchor}</div>
        <div className="tv-runway__num" style={{ fontSize: 26 }}>
          this morning chunk
        </div>
        <div className="tv-runway__label">
          {overdue
            ? 'the chain is a bit longer than the time left'
            : 'enough room for the prep that\u2019s left'}
        </div>
      </section>
    );
  }
  return (
    <section className="tv-runway">
      <div className="tv-label">runway · {anchor}</div>
      <div className="tv-runway__num">
        {minutes}<span style={{ fontSize: 16, color: 'var(--ink-mute)', marginLeft: 4 }}>min</span>
      </div>
      <div className="tv-runway__label">
        {overdue
          ? <>chain wants <span className="tv-mono" style={{ fontStyle: 'normal' }}>{required}m</span>. {' '}
              <em>time physics is running tight, not you.</em></>
          : <>the remaining prep needs <span className="tv-mono" style={{ fontStyle: 'normal' }}>{required}m</span>. enough.</>}
      </div>
    </section>
  );
}

function Timeline({ blocks, now, keystoneMark }) {
  return (
    <section aria-label="today's chain" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="tv-label" style={{ paddingBottom: 8 }}>chain · backward from anchor</div>
      {blocks.map((b, i) => (
        <article
          key={i}
          className={`tv-block tv-block--${b.state} ${b.keystone ? 'tv-block--keystone' : ''}`}
        >
          <div className="tv-block__time">{b.t}</div>
          <div className="tv-block__gutter">{keystoneMark === false && b.keystone ? '' : b.mark}</div>
          <div className="tv-block__body">
            <div className="tv-block__name" style={b.anchor ? { fontStyle: 'italic' } : null}>
              {b.name}
            </div>
            <div className="tv-block__meta">
              {b.env}
              {b.keystone && keystoneMark !== false && <span style={{ color: 'var(--accent-soft)' }}>  ·  keystone</span>}
              {b.note && <span>  ·  {b.note}</span>}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function StateDeclaration({ onClose, voiceCopy }) {
  const options = [
    { k: 'clear',  label: voiceCopy('stateClear'),  meta: '75 min ramp' },
    { k: 'foggy',  label: voiceCopy('stateFoggy'),  meta: '90 min ramp' },
    { k: 'empty',  label: voiceCopy('stateEmpty'),  meta: '120 min ramp · rest valid' },
  ];
  return (
    <div className="tv-prompt" role="dialog" aria-label="state declaration">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="tv-label">state · for chain padding only</div>
        <button className="tv-close" onClick={onClose}>close</button>
      </div>
      <h2 className="tv-prompt__title">{voiceCopy('stateTitle')}</h2>
      <p className="tv-prompt__caption">{voiceCopy('stateCaption')}</p>
      <div className="tv-actions">
        {options.map(o => (
          <button key={o.k} className="tv-btn" onClick={onClose}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">{o.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TriagePrompt({ onClose, voiceCopy }) {
  const options = [
    { k: 'keystone', label: voiceCopy('triProtect'), meta: 'keep the bare minimum' },
    { k: 'skip',     label: voiceCopy('triSkip'),    meta: 'mark anchor skipped' },
    { k: 'recalc',   label: voiceCopy('triRecalc'),  meta: 'rebuild from now' },
  ];
  return (
    <div className="tv-prompt" role="dialog" aria-label="triage">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="tv-label">triage · no rush</div>
        <button className="tv-close" onClick={onClose}>back</button>
      </div>
      <h2 className="tv-prompt__title">{voiceCopy('triTitle')}</h2>
      <p className="tv-prompt__caption">{voiceCopy('triCaption')}</p>
      <div className="tv-actions">
        {options.map((o, i) => (
          <button key={o.k} className={`tv-btn ${i === 0 ? 'tv-btn--primary' : ''}`} onClick={onClose}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">{o.meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeltHelpfulPrompt({ onClose, voiceCopy }) {
  const options = ['Yes, it helped.', 'Somewhat.', 'Not really.'];
  return (
    <div className="tv-prompt" role="dialog" aria-label="felt helpful">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="tv-label">closing the day</div>
        <button className="tv-close" onClick={onClose}>back</button>
      </div>
      <h2 className="tv-prompt__title">{voiceCopy('feltTitle')}</h2>
      <p className="tv-prompt__caption">{voiceCopy('feltCaption')}</p>
      <div className="tv-actions">
        {options.map(o => (
          <button key={o} className="tv-btn" onClick={onClose}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o}</span>
            <span className="tv-btn__hint">→</span>
          </button>
        ))}
      </div>
      <p className="tv-foot-note">
        {voiceCopy('feltFoot')}
      </p>
    </div>
  );
}

// ─── Voice registers ────────────────────────────────────────────
const COPY = {
  plain: {
    triageNudge: 'The chain wants more time than the runway has. Not a panic — a decision.',
    triageOpen: 'open triage',
    declareOpen: 'Declare a state',
    footer: 'Screenshot this if you want to leave the app. The plan does not need you to stay here.',
    stateTitle: 'Where is your energy at right now?',
    stateCaption: 'There is no wrong answer. This only changes how much time the chain leaves you.',
    stateClear: 'Clear and ready to act.',
    stateFoggy: 'A bit foggy — take the gentle ramp.',
    stateEmpty: 'Running on empty.',
    triTitle: 'Time physics check: we are running a bit behind the original plan.',
    triCaption: 'Don\u2019t rush or panic — let\u2019s just triage.',
    triProtect: 'Protect the keystone.',
    triSkip: 'Skip this anchor entirely.',
    triRecalc: 'Recalculate from right now.',
    feltTitle: 'Did the app help carry the load for your working memory today?',
    feltCaption: 'This is a question about the tool, not about you.',
    feltFoot: 'No answer is fine either. Close when you\u2019re ready.',
  },
  clinical: {
    triageNudge: 'Required prep duration exceeds the runway window to the effective arrival deadline. A triage decision is available.',
    triageOpen: 'open triage decision',
    declareOpen: 'Capture current state',
    footer: 'This view is intended for short, intermittent use. No data is retained between sessions.',
    stateTitle: 'Self-report: current energy state.',
    stateCaption: 'Used to set wake-ramp duration. Not stored beyond this session.',
    stateClear: 'Clear · ready to initiate action.',
    stateFoggy: 'Foggy · standard ramp recommended.',
    stateEmpty: 'Depleted · extended ramp or rest day.',
    triTitle: 'Runway is below required duration. Triage decision required.',
    triCaption: 'Three options. Each is a valid clinical decision.',
    triProtect: 'Protect keystone activity (e.g. medication, hygiene).',
    triSkip: 'Mark anchor as skipped. No penalty.',
    triRecalc: 'Recalculate timeline from current moment.',
    feltTitle: 'Convivial-tool check: did the system reduce cognitive load today?',
    feltCaption: 'A measure of the tool, not the user.',
    feltFoot: 'Skip is a valid response. The app stores nothing.',
  },
  warm: {
    triageNudge: 'The plan is a little longer than the time left. Nothing\u2019s on fire — we can choose.',
    triageOpen: 'look at the options',
    declareOpen: 'Tell the app how you are',
    footer: 'You can leave any time. The plan won\u2019t be sad.',
    stateTitle: 'How are you, right now?',
    stateCaption: 'Whatever you pick is just information. No score, no streak.',
    stateClear: 'I\u2019m okay. Let\u2019s go.',
    stateFoggy: 'Foggy. Easy on me, please.',
    stateEmpty: 'Empty tank. I need slow.',
    triTitle: 'We\u2019re a bit behind. That\u2019s information, not failure.',
    triCaption: 'Pick whichever feels possible.',
    triProtect: 'Just keep the essentials. Go.',
    triSkip: 'Skip the appointment. Today is allowed to be small.',
    triRecalc: 'Start the plan again from now.',
    feltTitle: 'Did this help, today?',
    feltCaption: 'It\u2019s okay if it didn\u2019t. The point is to ask.',
    feltFoot: 'Either way, thank you for being here. Goodnight.',
  },
};

Object.assign(window, { TodayScreen });
