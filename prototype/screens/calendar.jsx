// screens/calendar.jsx — Google/Microsoft calendar links + .ics export.
// Stateless posture: only anchor start/end/title are cached, never full calendar content.

function CalendarScreen({ tweak, navigate }) {
  const [connections, setConnections] = React.useState([
    { id: 'google', name: 'Google Calendar', state: 'disconnected' },
    { id: 'ms',     name: 'Microsoft / Outlook', state: 'disconnected' },
  ]);
  const [syncing, setSyncing] = React.useState(null);

  const toggle = (id) => {
    setConnections(cs => cs.map(c => {
      if (c.id !== id) return c;
      if (c.state === 'connected') return { ...c, state: 'disconnected' };
      setSyncing(id);
      setTimeout(() => setSyncing(null), 900);
      return { ...c, state: 'connected' };
    }));
  };

  const anyConnected = connections.some(c => c.state === 'connected');

  return (
    <div className="tv-page tv-fade" data-screen-label="Calendar">
      <header className="tv-head">
        <div className="tv-head__date">settings · calendar</div>
        <div className="tv-head__clock">sources</div>
      </header>

      <h1 className="tv-display" style={{ fontSize: 26 }}>Anchors can come from a real calendar.</h1>
      <p className="tv-prose">
        Connect a calendar to pull events in as candidate anchors. Only event title, start, and end are cached on this device to compute a chain — nothing is uploaded, and attendees / descriptions / locations are never stored.
      </p>

      {tweak?.network === 'offline' && (
        <div className="tv-banner tv-banner--offline">
          <span className="tv-banner__dot" />
          <div className="tv-banner__text">
            <span className="tv-banner__title">Offline</span>
            <span className="tv-banner__sub">Calendar connect and sync need a connection. Cached anchors from last sync still work.</span>
          </div>
        </div>
      )}

      <section>
        {connections.map(c => (
          <article key={c.id} className="tv-connect-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="tv-connect-row__name">{c.name}</div>
              <div className="tv-connect-row__meta">
                {c.state === 'connected'
                  ? (syncing === c.id ? 'syncing…' : 'connected · synced 2 min ago')
                  : 'not connected'}
              </div>
            </div>
            <button
              className={`tv-btn ${c.state === 'connected' ? 'tv-btn--quiet' : 'tv-btn--primary'}`}
              style={{ width: 'auto' }}
              disabled={tweak?.network === 'offline'}
              onClick={() => toggle(c.id)}
            >
              <span>{c.state === 'connected' ? 'Disconnect' : 'Connect'}</span>
            </button>
          </article>
        ))}
      </section>

      <div className="tv-card">
        <div className="tv-label">what becomes an anchor</div>
        <p className="tv-prose" style={{ margin: 0, fontSize: 15 }}>
          Only events you mark as anchors show up in the chain builder — a synced calendar is a menu, not an automatic import. All-day events and declined invites are ignored by default.
        </p>
      </div>

      <div className="tv-card tv-card--quote">
        <div className="tv-label">no account, still exportable</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          Don't want to connect anything? Export today's chain as a standard <code style={{ fontFamily: 'var(--mono)', background: 'var(--paper-deep)', padding: '1px 5px' }}>.ics</code> file and drop it into any calendar app by hand.
        </p>
      </div>

      <div className="tv-actions">
        <button className="tv-btn" disabled={tweak?.network === 'offline'}>
          <span>Export today's chain (.ics)</span>
          <span className="tv-btn__hint">download</span>
        </button>
        {anyConnected && (
          <button className="tv-btn tv-btn--ghost" onClick={() => navigate('plan')}>
            <span>Pick an anchor from calendar</span>
            <span className="tv-btn__hint">→ plan</span>
          </button>
        )}
        <button className="tv-btn tv-btn--ghost" onClick={() => navigate('settings')}>
          <span>← back to settings</span>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { CalendarScreen });
