// screens/travel.jsx — location_travel_profiles CRUD.
// Label-based rules, no maps/geocoding. Strict-by-default lateness.

function TravelScreen({ navigate }) {
  const [profiles, setProfiles] = React.useState([
    { id: 'p1', label: 'Home → King\u2019s (campus)', total: 45, slots: ['09:50 walk + bus 25', '10:05 bus 12 (later)'], maxLate: 0 },
    { id: 'p2', label: 'Home → Library',              total: 20, slots: ['walk, no fixed slot'],                        maxLate: 5 },
    { id: 'p3', label: 'Home (same location)',         total: 0,  slots: ['no travel block'],                            maxLate: 0, same: true },
  ]);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ label: '', total: 20 });

  const addProfile = () => {
    if (!draft.label.trim()) return;
    setProfiles(p => [...p, { id: 'p' + (p.length + 1), label: draft.label, total: draft.total, slots: ['manual departure — none set'], maxLate: 0 }]);
    setDraft({ label: '', total: 20 });
    setAdding(false);
  };

  return (
    <div className="tv-page tv-fade" data-screen-label="Travel Profiles">
      <header className="tv-head">
        <div className="tv-head__date">settings · travel</div>
        <div className="tv-head__clock">location profiles</div>
      </header>

      <h1 className="tv-display" style={{ fontSize: 26 }}>Reusable travel, by label.</h1>
      <p className="tv-prose">
        No maps, no geocoding. You name a place once with a total travel time (and optional manual departure slots) — every anchor at that label reuses it. Home and same-location anchors never get a travel block.
      </p>

      <section>
        {profiles.map(p => (
          <article key={p.id} className="tv-profile-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="tv-profile-row__label">{p.label}</div>
              <div className="tv-profile-row__meta">
                {p.same ? 'no travel block' : `${p.total} min total`}
                {'  ·  '}{p.slots[0]}
                {'  ·  max late '}{p.maxLate}min{p.maxLate === 0 && ' (strict)'}
              </div>
            </div>
            <button className="tv-btn tv-btn--ghost" style={{ width: 'auto' }} onClick={() => setProfiles(ps => ps.filter(x => x.id !== p.id))}>
              <span>remove</span>
            </button>
          </article>
        ))}
      </section>

      {!adding ? (
        <button className="tv-btn" onClick={() => setAdding(true)}>
          <span>+ add a location profile</span>
          <span className="tv-btn__hint">label · travel · slots</span>
        </button>
      ) : (
        <div className="tv-card">
          <div className="tv-label">new profile</div>
          <input
            className="tv-ui"
            placeholder="Label — e.g. Home → Library"
            value={draft.label}
            onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
            style={{ border: '1px solid var(--rule-strong)', padding: '10px 12px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--serif)', fontSize: 15 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tv-ui-s">total travel (min)</span>
            <input
              type="number"
              value={draft.total}
              onChange={e => setDraft(d => ({ ...d, total: Number(e.target.value) }))}
              style={{ width: 64, border: '1px solid var(--rule-strong)', padding: '6px 8px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 13 }}
            />
          </div>
          <div className="tv-actions">
            <button className="tv-btn tv-btn--primary" onClick={addProfile}><span>Save profile</span><span className="tv-btn__hint">strict by default</span></button>
            <button className="tv-btn tv-btn--ghost" onClick={() => setAdding(false)}><span>Cancel</span></button>
          </div>
        </div>
      )}

      <div className="tv-card tv-card--quote">
        <div className="tv-label">strict-by-default</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          Every anchor assumes <code style={{ fontFamily: 'var(--mono)', background: 'var(--paper-deep)', padding: '1px 5px' }}>max_late_minutes = 0</code> unless you override it on that anchor. Effective deadline is always <em>anchor start + override</em> — never the anchor's own end time.
        </p>
      </div>

      <button className="tv-btn tv-btn--ghost" onClick={() => navigate('settings')}>
        <span>← back to settings</span>
      </button>
    </div>
  );
}

Object.assign(window, { TravelScreen });
