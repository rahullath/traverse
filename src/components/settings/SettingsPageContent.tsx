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

        <Setting name="Habit log" hint="Kept around for users mid-migration. Feeds chain padding, never streaks. Will be removed when the new system stabilises."
          control={<span className="tv-ui-s" style={{ fontStyle: 'italic' }}>legacy</span>} />
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

        <Setting name="Delete account" hint="Removes everything. This isn't wired to a live action yet — reach out if you need this now."
          control={<span className="tv-ui-s" style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>contact to request</span>} />
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
          traverse runs on donations, not subscriptions — you keep full access either way. If it's been useful, you can chip in from{' '}
          <a href="/billing" style={{ color: 'var(--accent)' }}>the support page</a>.
        </p>
      </Card>

      <div className="tv-actions" style={{ marginTop: 8 }}>
        <Button hint="→" onClick={() => { window.location.href = '/clinical'; }}>Read the clinical reasoning</Button>
        <Button variant="ghost" onClick={() => { window.location.href = '/today'; }}>← back to today</Button>
      </div>
    </Page>
  );
}
