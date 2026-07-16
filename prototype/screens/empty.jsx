// screens/empty.jsx — the anchor-less day. Three variants behind a tweak.

function EmptyScreen({ tweak, navigate }) {
  const variant = tweak.anchorless; // 'suggest' | 'refuse' | 'choice'

  return (
    <div className="tv-page tv-fade" data-screen-label="Empty Day">
      <header className="tv-head">
        <div className="tv-head__date">no fixed anchor</div>
        <div className="tv-head__clock">{tweak.timeFormat === 'chunks' ? 'morning' : '09:34'}</div>
      </header>

      {variant === 'suggest' && <EmptySuggest navigate={navigate} />}
      {variant === 'refuse' && <EmptyRefuse navigate={navigate} />}
      {variant === 'choice' && <EmptyChoice navigate={navigate} />}
    </div>);

}

function EmptySuggest({ navigate }) {
  const z = [
  { k: 'sun', label: 'Sunlight on your face.', meta: 'environmental · ~5 min' },
  { k: 'meal', label: 'The next time you eat.', meta: 'bodily · whenever' },
  { k: 'msg', label: 'The first WhatsApp you reply to.', meta: 'social · cue' },
  { k: 'tea', label: 'Flatmate makes tea.', meta: 'social · ambient' },
  { k: 'cat', label: 'The cat\u2019s dinner.', meta: 'bodily · 18:00-ish' },
  { k: 'set', label: 'Sunset.', meta: 'environmental · soft close' }];

  return (
    <>
      <div className="tv-label">social zeitgebers · pick one to build from</div>
      <h1 className="tv-display">
        Nothing is fixed today. <em>What\u2019s the next thing that happens whether you act or not?</em>
      </h1>
      <p className="tv-prose">
        Time-blind brains are weaker at clock-time and stronger at events. Pick any one of these — a chain can be hung off it.
      </p>
      <div className="tv-actions">
        {z.map((o) =>
        <button key={o.k} className="tv-btn" onClick={() => navigate('plan')}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{o.label}</span>
            <span className="tv-btn__hint">{o.meta}</span>
          </button>
        )}
      </div>
      <p className="tv-foot-note">
        Or: <button className="tv-btn tv-btn--ghost" style={{ display: 'inline', padding: 0, width: 'auto', border: 0 }} onClick={() => navigate('empty-refuse')}>do nothing today on purpose →</button>
      </p>
    </>);

}

function EmptyRefuse({ navigate }) {
  return (
    <>
      <div className="tv-label">no plan</div>
      <h1 className="tv-display">
        Rest is also valid.
      </h1>
      <p className="tv-prose">
        Behavioural activation, the clinical evidence base behind every chain in this app, doesn\u2019t require a productive day. It requires <strong>one small concrete action</strong> aligned with what you care about. Today, that\u2019s allowed to be tiny.
      </p>
      <div className="tv-card">
        <div className="tv-label">smallest possible</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          <em>Shower. Open a window. Step outside for two minutes. Reply to one message.</em>
        </p>
        <p className="tv-prose" style={{ margin: 0, fontSize: 15 }}>
          Pick one of these or none at all. Then close the app.
        </p>
      </div>
      <div className="tv-actions">
        <button className="tv-btn tv-btn--primary" onClick={() => navigate('today-fresh')}>
          <span>Close the app</span>
          <span className="tv-btn__hint">enough</span>
        </button>
        <button className="tv-btn tv-btn--quiet" onClick={() => navigate('empty')}>
          <span>Show me a zeitgeber instead</span>
          <span className="tv-btn__hint">switch</span>
        </button>
      </div>
      <p className="tv-foot-note">
        The app stores nothing about this. There is no streak to break.
      </p>
    </>);

}

function EmptyChoice({ navigate }) {
  return (
    <>
      <div className="tv-label">no fixed anchor</div>
      <h1 className="tv-display">
        Two ways today can go.
      </h1>
      <p className="tv-prose">You don't have to plan to be having a day. Pick whichever sounds more possible right now.

      </p>

      <div className="tv-card" style={{ marginTop: 4 }}>
        <div className="tv-label">option · one</div>
        <p className="tv-serif" style={{ fontSize: 20, margin: 0, lineHeight: 1.25 }}>
          Find a soft anchor — a meal, the sunset, a friend — and build a small chain backward from it.
        </p>
        <button className="tv-btn tv-btn--primary" onClick={() => navigate('empty')}>
          <span>Find an anchor</span>
          <span className="tv-btn__hint">→ build</span>
        </button>
      </div>

      <div className="tv-card" style={{ marginTop: 4 }}>
        <div className="tv-label">option · two</div>
        <p className="tv-serif" style={{ fontSize: 20, margin: 0, lineHeight: 1.25 }}>
          Today is a rest day on purpose. One small act, then close the app.
        </p>
        <button className="tv-btn" onClick={() => navigate('empty-refuse')}>
          <span>Rest day</span>
          <span className="tv-btn__hint">→ small</span>
        </button>
      </div>

      <p className="tv-foot-note">
        Either is a complete day. Neither is failure.
      </p>
    </>);

}

Object.assign(window, { EmptyScreen });