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

export default function CalendarPageContent({ theme, density, motion = true }: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    if (success) setBanner(`Connected — ${success.replace(/_/g, ' ')}.`);
    if (error) setBanner(`Connection failed — ${error.replace(/_/g, ' ')}.`);

    fetch('/api/calendar/sources')
      .then(r => r.ok ? r.json() : { sources: [] })
      .then(d => setSources(d.sources ?? []))
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

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
    setSources(s => s.filter(x => x.id !== source.id));
    await fetch(`/api/calendar/sources?id=${source.id}`, { method: 'DELETE' }).catch(() => {});
  };

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
                    {source
                      ? `connected${source.last_sync ? ` · synced ${new Date(source.last_sync).toLocaleString()}` : ''}`
                      : 'not connected'}
                  </div>
                </div>
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
