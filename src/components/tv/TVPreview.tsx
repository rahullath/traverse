import React, { useState } from 'react';
import { Block } from './Block';
import { Button } from './Button';
import { Card } from './Card';
import { Display } from './Display';
import { Label } from './Label';
import { Mark } from './Mark';
import { Page } from './Page';
import { Prompt } from './Prompt';
import { Prose } from './Prose';
import { Rule } from './Rule';
import { Runway } from './Runway';
import { Seg } from './Seg';
import { Setting } from './Setting';

const BLOCKS = [
  { time: '07:30', state: 'past' as const,   name: 'Wake — open the curtains', meta: 'wake ramp' },
  { time: '08:00', state: 'past' as const,   name: 'Shower',                   meta: 'wake ramp', keystone: true, note: 'kept the rhythm' },
  { time: '08:30', state: 'past' as const,   name: 'Medication, glass of water',meta: 'wake ramp', keystone: true },
  { time: '09:15', state: 'now' as const,    name: 'Dress · pack bag · keys',  meta: 'prep · exit' },
  { time: '09:50', state: 'future' as const, name: 'Walk to the bus stop',     meta: 'travel' },
  { time: '11:00', state: 'future' as const, name: "Linguistics lecture · King's 2.04", meta: 'anchor', anchor: true },
];

export function TVPreview() {
  const [theme, setTheme]     = useState<'daylight' | 'lamp'>('daylight');
  const [density, setDensity] = useState<'standard' | 'roomy'>('standard');
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: '100vh' }}>
      {/* Controls */}
      <div style={{
        width: 160, flexShrink: 0, padding: '24px 16px',
        borderRight: '1px solid #ddd', fontFamily: 'monospace',
        fontSize: 12, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>tv primitives</strong>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Theme
          <select value={theme} onChange={e => setTheme(e.target.value as any)}>
            <option value="daylight">daylight</option>
            <option value="lamp">lamp</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Density
          <select value={density} onChange={e => setDensity(e.target.value as any)}>
            <option value="standard">standard</option>
            <option value="roomy">roomy</option>
          </select>
        </label>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, maxWidth: 430 }}>
        <Page theme={theme} density={density}>

          {/* Typography */}
          <Label>Typography</Label>
          <Display>The plan does not need you to stay here.</Display>
          <Prose>
            This is body prose — Newsreader, 17px, ink-soft.{' '}
            <strong>Strong text</strong> lifts to ink.
          </Prose>
          <Rule />

          {/* Runway */}
          <Label>Runway</Label>
          <Runway
            num={21}
            unit="min"
            label="runway · lecture, 11:00"
            caption={
              <>chain wants <span className="tv-mono">35m</span>.{' '}
                <em>time physics is running tight, not you.</em></>
            }
          />

          {/* Timeline */}
          <Label>Timeline blocks</Label>
          <section style={{ display: 'flex', flexDirection: 'column' }}>
            {BLOCKS.map((b, i) => (
              <Block key={i} {...b} />
            ))}
          </section>
          <Rule />

          {/* Marks */}
          <Label>Margin marks</Label>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 0' }}>
            <Mark kind="now" />
            <Mark kind="keystone" />
            <Mark kind="past" />
          </div>
          <Rule />

          {/* Buttons */}
          <Label>Buttons</Label>
          <div className="tv-actions">
            <Button variant="primary" hint="→">Primary action</Button>
            <Button hint="state">Declare a state</Button>
            <Button variant="quiet" hint="close">End the day in the app</Button>
            <Button variant="ghost" hint="→">Ghost / inline link</Button>
          </div>
          <Rule />

          {/* Card */}
          <Label>Card (quote)</Label>
          <Card variant="quote">
            <Label>time physics</Label>
            <Prose style={{ margin: 0 }}>
              The chain wants more time than the runway has. Not a panic — a decision.
            </Prose>
            <Button variant="ghost" hint="→">open triage</Button>
          </Card>
          <Rule />

          {/* Prompt */}
          <Label>Prompt</Label>
          {promptOpen ? (
            <Prompt
              label="state · for chain padding only"
              title="Where is your energy at right now?"
              caption="There is no wrong answer. This only changes how much time the chain leaves you."
              onClose={() => setPromptOpen(false)}
            >
              <Button hint="75 min ramp">Clear and ready to act.</Button>
              <Button hint="90 min ramp">A bit foggy — take the gentle ramp.</Button>
              <Button hint="120 min ramp · rest valid">Running on empty.</Button>
            </Prompt>
          ) : (
            <Button onClick={() => setPromptOpen(true)} hint="demo">Open prompt</Button>
          )}
          <Rule />

          {/* Settings */}
          <Label>Settings rows</Label>
          <Setting
            name="Theme"
            hint="Affects background and contrast only."
            control={
              <Seg
                value={theme}
                options={['daylight', 'lamp']}
                onChange={v => setTheme(v as any)}
              />
            }
          />
          <Setting
            name="Density"
            hint="Roomy adds 15% spacing."
            control={
              <Seg
                value={density}
                options={['standard', 'roomy']}
                onChange={v => setDensity(v as any)}
              />
            }
          />
          <Setting
            name="Voice register"
            control={
              <Seg
                value="plain"
                options={['plain', 'clinical', 'warm']}
                onChange={() => {}}
              />
            }
          />
          <Rule />

          <p className="tv-foot-note">
            All primitives visible. Both themes work via the controls above.
          </p>

        </Page>
      </div>
    </div>
  );
}
