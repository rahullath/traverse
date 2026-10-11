import React, { useState, useEffect } from 'react';
import { Page, Card, Button } from '@/components/tv';

interface Profile {
  id: string;
  label: string;
  travel_minutes: number;
  departure_slots: string[];
  strict_by_default: boolean;
}

export interface Props {
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
  motion?: boolean;
}

export default function TravelPageContent({ theme, density, motion = true }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftMinutes, setDraftMinutes] = useState(20);

  useEffect(() => {
    fetch('/api/location-travel-profiles')
      .then(r => r.ok ? r.json() : { profiles: [] })
      .then(d => setProfiles(d.profiles ?? []))
      .finally(() => setLoading(false));
  }, []);

  const addProfile = async () => {
    if (!draftLabel.trim()) return;
    const res = await fetch('/api/location-travel-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: draftLabel.trim(), travel_minutes: draftMinutes }),
    }).catch(() => null);
    if (res?.ok) {
      const { profile } = await res.json();
      setProfiles(p => [...p.filter(x => x.id !== profile.id), profile].sort((a, b) => a.label.localeCompare(b.label)));
    }
    setDraftLabel(''); setDraftMinutes(20); setAdding(false);
  };

  const removeProfile = async (id: string) => {
    setProfiles(p => p.filter(x => x.id !== id));
    await fetch(`/api/location-travel-profiles/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <Page theme={theme} density={density} motion={motion} active="settings">
      <header className="tv-head">
        <div className="tv-head__date">settings · travel</div>
        <div className="tv-head__clock">location profiles</div>
      </header>

      <h1 className="tv-display" style={{ fontSize: 26 }}>Reusable travel, by label.</h1>
      <p className="tv-prose">
        No maps, no geocoding. You name a place once with a total travel time — every anchor at that label reuses it. Home and same-location anchors never get a travel block.
      </p>

      {loading && <p className="tv-prose" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>loading profiles…</p>}

      {!loading && (
        <section>
          {profiles.length === 0 && (
            <p className="tv-prose" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>No travel profiles yet.</p>
          )}
          {profiles.map(p => (
            <article key={p.id} className="tv-profile-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div className="tv-profile-row__label">{p.label}</div>
                <div className="tv-profile-row__meta">
                  {p.travel_minutes} min total
                  {p.departure_slots.length > 0 && `  ·  ${p.departure_slots[0]}`}
                  {'  ·  max late '}{p.strict_by_default ? '0min (strict)' : '5min'}
                </div>
              </div>
              <Button variant="ghost" className="tv-inline-btn" onClick={() => removeProfile(p.id)}>remove</Button>
            </article>
          ))}
        </section>
      )}

      {!adding ? (
        <button className="tv-btn" onClick={() => setAdding(true)}>
          <span>+ add a location profile</span>
          <span className="tv-btn__hint">label · travel · slots</span>
        </button>
      ) : (
        <Card>
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
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card variant="quote">
        <div className="tv-label">strict-by-default</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          Every anchor assumes <code style={{ fontFamily: 'var(--mono)', background: 'var(--paper-deep)', padding: '1px 5px' }}>max_late_minutes = 0</code> unless you override it on that anchor. Effective deadline is always <em>anchor start + override</em> — never the anchor's own end time.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => { window.location.href = '/settings'; }}>← back to settings</Button>
    </Page>
  );
}
