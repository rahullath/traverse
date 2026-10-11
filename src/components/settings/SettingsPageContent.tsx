import React, { useState } from 'react';
import { Page, Setting, Seg, Card, Button } from '@/components/tv';

type Theme = 'daylight' | 'lamp';
type Motion = 'full' | 'off';
type Density = 'standard' | 'roomy';
type Voice = 'plain' | 'clinical' | 'warm';
type TimeFormat = 'clock' | 'chunks';
type Anchorless = 'choice' | 'suggest' | 'refuse';

export interface Props {
  email: string;
  theme: Theme;
  motion: Motion;
  density: Density;
  voice: Voice;
  timeFormat: TimeFormat;
  anchorless: Anchorless;
}

const DONATION_URL = import.meta.env.PUBLIC_DONATION_URL as string | undefined;

function save(patch: Record<string, unknown>) {
  fetch('/api/auth/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

export default function SettingsPageContent({ email, theme: initTheme, motion: initMotion, density: initDensity, voice: initVoice, timeFormat: initTimeFormat, anchorless: initAnchorless }: Props) {
  const [theme, setTheme] = useState<Theme>(initTheme);
  const [motion, setMotion] = useState<Motion>(initMotion);
  const [density, setDensity] = useState<Density>(initDensity);
  const [voice, setVoice] = useState<Voice>(initVoice);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(initTimeFormat);
  const [anchorless, setAnchorless] = useState<Anchorless>(initAnchorless);
  const [deleting, setDeleting] = useState(false);

  return (
    <Page theme={theme} density={density} motion={motion === 'full'} active="settings">
      <header className="tv-head">
        <div className="tv-head__date">comfort & focus</div>
        <div className="tv-head__clock">settings</div>
      </header>

      <h1 className="tv-display" style={{ fontSize: 28 }}>How should the app feel today?</h1>
      <p className="tv-prose">
        These settings sync to your account so they follow you across devices. No analytics tracking, no behavioural model — just comfort preferences.
      </p>

      <section>
        <div className="tv-label" style={{ paddingTop: 8, paddingBottom: 4 }}>sensory</div>

        <Setting name="Theme" hint="Paper-light is the default. Lamp is a low-stim warm dark — not pure black."
          control={
            <Seg value={theme} options={[{ value: 'daylight', label: 'Daylight' }, { value: 'lamp', label: 'Lamp' }]}
              onChange={(v) => { setTheme(v as Theme); save({ theme: v }); }} />
          } />

        <Setting name="Motion" hint="Animations are already minimal. You can remove them entirely."
          control={
            <Seg value={motion} options={[{ value: 'full', label: 'Subtle' }, { value: 'off', label: 'None' }]}
              onChange={(v) => { setMotion(v as Motion); save({ motion: v }); }} />
          } />

        <Setting name="Density" hint="Roomy if you find dense text overwhelming."
          control={
            <Seg value={density} options={[{ value: 'roomy', label: 'Roomy' }, { value: 'standard', label: 'Standard' }]}
              onChange={(v) => { setDensity(v as Density); save({ density: v }); }} />
          } />
      </section>

      <section>
        <div className="tv-label" style={{ paddingTop: 16, paddingBottom: 4 }}>language</div>

        <Setting name="Voice" hint="How the app phrases things. Plain is default. Clinical is for clinicians or coregulators. Warm is more personable."
          control={
            <Seg value={voice} options={[{ value: 'plain', label: 'Plain' }, { value: 'clinical', label: 'Clinical' }, { value: 'warm', label: 'Warm' }]}
              onChange={(v) => { setVoice(v as Voice); save({ voice: v }); }} />
          } />

        <Setting name="Time format" hint="Clock numbers can be hard to feel. Chunks (morning / afternoon) match how time blindness perceives the day."
          control={
            <Seg value={timeFormat} options={[{ value: 'clock', label: 'Clock' }, { value: 'chunks', label: 'Chunks' }]}
              onChange={(v) => { setTimeFormat(v as TimeFormat); save({ timeFormat: v }); }} />
          } />

        <Setting name="Anchor-less days" hint="When you open the app without a fixed event in mind."
          control={
            <Seg value={anchorless} options={[{ value: 'choice', label: 'Ask me' }, { value: 'suggest', label: 'Suggest' }, { value: 'refuse', label: 'Rest' }]}
              onChange={(v) => { setAnchorless(v as Anchorless); save({ anchorless: v }); }} />
          } />
      </section>

      <section>
        <div className="tv-label" style={{ paddingTop: 16, paddingBottom: 4 }}>data & connections</div>

        <Setting name="Calendar" hint="Connect Google or Microsoft to pull anchors in, or export a chain as .ics."
          control={<Button variant="quiet" className="tv-inline-btn" onClick={() => { window.location.href = '/settings/calendar'; }}>Open</Button>} />

        <Setting name="Travel profiles" hint="Reusable location-to-location travel times and lateness overrides."
          control={<Button variant="quiet" className="tv-inline-btn" onClick={() => { window.location.href = '/settings/travel'; }}>Open</Button>} />

      </section>

      <section>
        <div className="tv-label" style={{ paddingTop: 16, paddingBottom: 4 }}>account</div>

        <Setting name="Signed in as" hint="Only used to restore chains between devices." control={<span className="tv-ui-s">{email}</span>} />

        <Setting name="Sign out" hint="Ends this session on this device."
          control={
            <form method="POST" action="/api/auth/logout">
              <button className="tv-btn tv-btn--quiet tv-inline-btn" type="submit">Sign out</button>
            </form>
          } />

        <Setting name="Export my data" hint="Your raw preferences record, as stored."
          control={<Button variant="quiet" className="tv-inline-btn" onClick={() => { window.location.href = '/api/auth/preferences'; }}>Export</Button>} />

        <Setting name="Delete account" hint="Removes your account and everything stored with it. Permanent — there is no undo."
          control={!deleting
            ? <Button variant="quiet" className="tv-inline-btn" onClick={() => setDeleting(true)}>Delete…</Button>
            : <span className="tv-ui-s">below ↓</span>} />

        {deleting && <DeleteAccount onCancel={() => setDeleting(false)} />}
      </section>

      <Card variant="quote" style={{ marginTop: 16 }}>
        <div className="tv-label">a note</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          The app does not analytics-log anything. No behavioural model of you is built. The point of this software is that you can stop using it when you no longer need it — not that you stay forever.
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div className="tv-label">support traverse</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          traverse is free and stays free — no trial, no paywall, nothing gets locked.
          {DONATION_URL ? (
            <>
              {' '}If it's carried some of the load for you and you have spare to give,{' '}
              <a href={DONATION_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>a small donation</a>{' '}
              keeps it running. Entirely optional.
            </>
          ) : null}
        </p>
      </Card>

      <div className="tv-actions" style={{ marginTop: 8 }}>
        <Button hint="→" onClick={() => { window.location.href = '/clinical'; }}>Read the clinical reasoning</Button>
        <Button variant="ghost" onClick={() => { window.location.href = '/today'; }}>← back to today</Button>
      </div>
    </Page>
  );
}

function DeleteAccount({ onCancel }: { onCancel: () => void }) {
  const [typed, setTyped] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = async () => {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ confirm: 'delete' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.queued) throw new Error(body.message || "Couldn't delete the account. Nothing was removed.");
      window.location.href = '/login';
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete the account. Nothing was removed.");
      setWorking(false);
    }
  };

  return (
    <Card variant="quote" style={{ marginTop: 8 }}>
      <div className="tv-label">delete account · permanent</div>
      <p className="tv-prose" style={{ margin: 0 }}>
        This deletes your plans, anchors, travel profiles, preferences and sign-in. Export first if you want a copy. Type <strong>delete</strong> to confirm.
      </p>
      <input
        aria-label="type delete to confirm"
        value={typed}
        onChange={e => setTyped(e.target.value)}
        autoComplete="off"
        style={{ border: '1px solid var(--rule-strong)', padding: '8px 10px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 14, marginTop: 8 }}
      />
      {error && <p className="tv-prose" role="alert" style={{ margin: '8px 0 0' }}>{error}</p>}
      <div className="tv-actions">
        <Button variant="primary" hint={working ? '…' : 'permanent'} onClick={() => { if (typed.trim().toLowerCase() === 'delete' && !working) confirmDelete(); }}>
          Delete my account
        </Button>
        <Button variant="ghost" onClick={onCancel}>Keep my account</Button>
      </div>
    </Card>
  );
}
