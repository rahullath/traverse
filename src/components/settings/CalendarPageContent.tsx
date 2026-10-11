import React, { useState, useEffect } from 'react';
import { Page, Card, Button, NetworkBanner } from '@/components/tv';

interface Source {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'ical' | 'manual';
  is_active: boolean;
  last_sync: string | null;
}

export interface Props {
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
  motion?: boolean;
}

const PROVIDERS: Array<{ type: 'google' | 'outlook'; name: string }> = [
  { type: 'google', name: 'Google Calendar' },
  { type: 'outlook', name: 'Microsoft / Outlook' },
];

const inputStyle: React.CSSProperties = { border: '1px solid var(--rule-strong)', padding: '10px 12px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--serif)', fontSize: 15, width: '100%', boxSizing: 'border-box', marginTop: 8 };

export default function CalendarPageContent({ theme, density, motion = true }: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [icalName, setIcalName] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [addingIcal, setAddingIcal] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    if (success) setBanner(`Connected — ${success.replace(/_/g, ' ')}.${params.get('warning') ? ' The first sync failed; try "Sync now".' : ''}`);
    if (error) setBanner(`Connection failed — ${error.replace(/_/g, ' ')}.`);

    loadSources().finally(() => setLoading(false));

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const loadSources = () =>
    fetch('/api/calendar/sources')
      .then(r => r.ok ? r.json() : { sources: [] })
      .then(d => setSources(d.sources ?? []))
      .catch(() => setBanner('Could not load your calendars. Check the connection and reload.'));

  const syncSource = async (source: Source) => {
    setSyncing(source.id);
    try {
      const res = await fetch(`/api/calendar/sync?source_id=${source.id}`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.queued) throw new Error(body.result?.errors?.[0] || body.error || 'sync failed');
      const r = body.result ?? {};
      setBanner(`${source.name} synced — ${r.events_added ?? 0} new, ${r.events_updated ?? 0} updated.`);
      await loadSources();
    } catch (e) {
      setBanner(`Couldn't sync ${source.name}: ${e instanceof Error ? e.message : 'try again'}.`);
    } finally {
      setSyncing(null);
    }
  };

  const addIcal = async () => {
    if (!icalUrl.trim()) { setBanner('Paste the calendar link first.'); return; }
    setAddingIcal(true);
    try {
      const res = await fetch('/api/calendar/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: icalName.trim() || 'Calendar link', type: 'ical', url: icalUrl.trim(), color: '#3e5b7e', sync_frequency: 60 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.queued) throw new Error(body.error || 'Could not add that link.');
      setIcalName(''); setIcalUrl('');
      setSources(s => [...s, body.source]);
      await syncSource(body.source);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : 'Could not add that link.');
    } finally {
      setAddingIcal(false);
    }
  };

  const icalSources = sources.filter(s => s.type === 'ical');

  const connectedFor = (type: string) => sources.find(s => s.type === type && s.is_active) ?? null;

  const connect = async (type: 'google' | 'outlook', name: string) => {
    setConnecting(type);
    try {
      const createRes = await fetch('/api/calendar/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, color: '#3e5b7e', sync_frequency: 60 }),
      });
      if (!createRes.ok) throw new Error('could not create source');
      const { source } = await createRes.json();

      const authRes = await fetch(`/api/calendar/${type}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id }),
      });
      if (!authRes.ok) {
        await fetch(`/api/calendar/sources?id=${source.id}`, { method: 'DELETE' }).catch(() => {});
        throw new Error('could not start authorization');
      }
      const { authUrl } = await authRes.json();
      window.location.href = authUrl;
    } catch {
      setConnecting(null);
      setBanner('Could not start the connection. Try again.');
    }
  };

  const disconnect = async (source: Source) => {
    const res = await fetch(`/api/calendar/sources?id=${source.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res || !res.ok) { setBanner(`Couldn't remove ${source.name}. Try again.`); return; }
    setSources(s => s.filter(x => x.id !== source.id));
  };

  const syncedMeta = (source: Source) =>
    `connected${source.last_sync ? ` · synced ${new Date(source.last_sync).toLocaleString()}` : ' · not synced yet'}`;

  const anyConnected = sources.some(s => s.is_active);

  return (
    <Page theme={theme} density={density} motion={motion} active="settings">
      <header className="tv-head">
        <div className="tv-head__date">settings · calendar</div>
        <div className="tv-head__clock">sources</div>
      </header>

      <h1 className="tv-display" style={{ fontSize: 26 }}>Anchors can come from a real calendar.</h1>
      <p className="tv-prose">
        Connect a calendar to pull events in as candidate anchors. Only event title, start, and end are cached to compute a chain — attendees, descriptions, and locations are never stored.
      </p>

      {!online && <NetworkBanner variant="offline" />}
      {banner && (
        <Card variant="quote">
          <p className="tv-prose" style={{ margin: 0 }}>{banner}</p>
        </Card>
      )}

      {!loading && (
        <section>
          {PROVIDERS.map(p => {
            const source = connectedFor(p.type);
            return (
              <article key={p.type} className="tv-connect-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div className="tv-connect-row__name">{p.name}</div>
                  <div className="tv-connect-row__meta">
                    {source ? syncedMeta(source) : 'not connected'}
                  </div>
                </div>
                {source && (
                  <Button variant="quiet" className="tv-inline-btn" disabled={!online || syncing === source.id} onClick={() => syncSource(source)}>
                    {syncing === source.id ? 'syncing…' : 'Sync now'}
                  </Button>
                )}
                <Button
                  variant={source ? 'quiet' : 'primary'}
                  className="tv-inline-btn"
                  disabled={!online || connecting === p.type}
                  onClick={() => source ? disconnect(source) : connect(p.type, p.name)}
                >
                  {connecting === p.type ? 'connecting…' : source ? 'Disconnect' : 'Connect'}
                </Button>
              </article>
            );
          })}
        </section>
      )}

      {!loading && (
        <section>
          <div className="tv-label" style={{ paddingTop: 16, paddingBottom: 4 }}>by link · ical / ics</div>
          {icalSources.map(source => (
            <article key={source.id} className="tv-connect-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="tv-connect-row__name">{source.name}</div>
                <div className="tv-connect-row__meta">{syncedMeta(source)}</div>
              </div>
              <Button variant="quiet" className="tv-inline-btn" disabled={!online || syncing === source.id} onClick={() => syncSource(source)}>
                {syncing === source.id ? 'syncing…' : 'Sync now'}
              </Button>
              <Button variant="quiet" className="tv-inline-btn" onClick={() => disconnect(source)}>Remove</Button>
            </article>
          ))}
          <Card>
            <p className="tv-prose" style={{ margin: 0, fontSize: 15 }}>
              Works with any calendar that gives you a subscribe link — Google ("Secret address in iCal format"), Outlook ("Publish calendar" → ICS), Apple iCloud ("Public calendar"), or a university timetable feed.
            </p>
            <input
              className="tv-ui"
              aria-label="calendar name"
              placeholder="Name — e.g. Uni timetable"
              value={icalName}
              onChange={e => setIcalName(e.target.value)}
              style={inputStyle}
            />
            <input
              className="tv-ui"
              aria-label="calendar link"
              placeholder="https://… or webcal://…"
              value={icalUrl}
              onChange={e => setIcalUrl(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 13 }}
            />
            <div className="tv-actions">
              <Button variant="primary" hint={addingIcal ? '…' : 'add + sync'} disabled={!online || addingIcal} onClick={addIcal}>
                Add calendar link
              </Button>
            </div>
          </Card>
        </section>
      )}

      <Card>
        <div className="tv-label">what becomes an anchor</div>
        <p className="tv-prose" style={{ margin: 0, fontSize: 15 }}>
          Only events you mark as anchors show up in the chain builder — a synced calendar is a menu, not an automatic import. All-day events and declined invites are ignored by default.
        </p>
      </Card>

      <Card variant="quote">
        <div className="tv-label">no account, still exportable</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          Don't want to connect anything? Export today's chain as a standard <code style={{ fontFamily: 'var(--mono)', background: 'var(--paper-deep)', padding: '1px 5px' }}>.ics</code> file and drop it into any calendar app by hand.
        </p>
      </Card>

      <div className="tv-actions">
        <Button disabled={!online} onClick={() => { window.location.href = '/api/daily-plan/export.ics'; }}>
          Export today's chain (.ics)
        </Button>
        {anyConnected && (
          <Button variant="ghost" onClick={() => { window.location.href = '/plan'; }}>
            Pick an anchor from calendar
          </Button>
        )}
        <Button variant="ghost" onClick={() => { window.location.href = '/settings'; }}>← back to settings</Button>
      </div>
    </Page>
  );
}
