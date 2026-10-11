import React from 'react';
import { Page, Card, Button } from '@/components/tv';

const ROWS = [
  {
    feat: 'Backwards-from-anchor chain',
    lit: 'A scaffolding for ADHD temporal myopia: time-blind brains experience time as "now vs. not-now". Working backwards from a fixed external event substitutes a perceivable sequence for an unperceivable duration.',
    cite: 'Barkley 2012  ·  ADHD time blindness',
  },
  {
    feat: 'Anchors as social and environmental events',
    lit: 'Social zeitgeber theory: disruptions to regular social routines destabilise circadian and biological rhythms. Stable external events (classes, shifts, meals, the sunset) re-entrain a disrupted clock without requiring willpower.',
    cite: 'Ehlers · Frank · Kupfer  ·  social zeitgeber theory',
  },
  {
    feat: 'Keystone activity — "when wake, then shower"',
    lit: 'Implementation intentions: if–then plans that link a specific cue to a specific action substantially increase goal completion across domains by automating cue-detection and reducing executive demand.',
    cite: 'Gollwitzer 1999, 2006  ·  if–then planning',
  },
  {
    feat: 'Concrete micro-steps, no insight required',
    lit: 'Behavioural activation: an evidence-based treatment for depression. Action precedes mood; small, value-aligned, observable behaviours are scheduled regardless of internal state.',
    cite: 'Lewinsohn, Jacobson, Martell  ·  BA for depression',
  },
  {
    feat: 'State Declaration · padding the ramp',
    lit: 'Capacity in ADHD and depression fluctuates without warning. Accommodating reported state (clear / foggy / empty) by altering the chain length, not by retracting it, supports access intimacy without surveillance.',
    cite: 'Hamraie & Fritsch  ·  crip technoscience',
  },
  {
    feat: 'Triage instead of red alerts',
    lit: 'Punitive UI escalates panic in ADHD, producing impulsive rushing or freeze. A calm three-choice triage (protect / skip / recalculate) offloads cognitive flexibility to the interface.',
    cite: 'Barkley · Sarkis  ·  ADHD inhibitory control',
  },
  {
    feat: 'No streaks · no analytics · no retention loops',
    lit: 'Streak-based gamification leverages intermittent reinforcement to drive engagement. In neurodivergent users, breaks in a streak produce shame and learned helplessness. We refuse this pattern as a clinical and political choice.',
    cite: 'Crip Justice  ·  Illich · convivial tools',
  },
  {
    feat: 'Stateless · the app aims for its own obsolescence',
    lit: 'A convivial tool is one the user can leave. Successful long-term use is the user internalising the structure (chain on paper, in head) and using the app less, not more.',
    cite: 'Illich 1973  ·  Tools for Conviviality',
  },
];

export interface Props {
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
  motion?: boolean;
  loggedIn?: boolean;
}

export default function ClinicalPageContent({ theme, density, motion = true, loggedIn = false }: Props) {
  return (
    <Page theme={theme} density={density} motion={motion} active="clinical">
      <header className="tv-head">
        <div className="tv-head__date">clinical reading</div>
        <div className="tv-head__clock">for reviewers</div>
      </header>

      <h1 className="tv-display">Each mechanism in this app is borrowed, not invented.</h1>
      <p className="tv-prose">
        traverse is a thin, user-controlled interface to five literatures: <strong>circadian and social entrainment</strong>, <strong>implementation intentions</strong>, <strong>behavioural activation</strong>, <strong>temporal myopia</strong>, and <strong>crip technoscience</strong>. We do not claim novelty in the science; we are committed to refusing the surveillance, gamification, and productivity logics that the rest of the market layers on top of it.
      </p>

      <hr className="tv-rule-strong tv-rule" />

      <section>
        {ROWS.map((r) => (
          <article key={r.feat} className="tv-cl-row">
            <div className="tv-cl-row__feat tv-serif">{r.feat}</div>
            <div className="tv-cl-row__lit tv-prose" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{r.lit}</div>
            <div className="tv-cl-row__cite">{r.cite}</div>
          </article>
        ))}
      </section>

      <Card variant="quote">
        <div className="tv-label">data posture</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          A sign-in is offered only to restore chains across devices. The core function — generate a chain, screenshot it, leave — works without an account. There is no third-party analytics. There are no push notifications. There is no behavioural model of the user stored anywhere in the system.
        </p>
      </Card>

      <div className="tv-actions">
        <Button variant="primary" hint="→ today" onClick={() => { window.location.href = loggedIn ? '/today' : '/login'; }}>
          Try the runtime
        </Button>
        <Button hint="→ plan" onClick={() => { window.location.href = loggedIn ? '/plan' : '/login'; }}>
          Try the chain builder
        </Button>
      </div>

      <p className="tv-foot-note">
        traverse · for clinical and NHS conversation, not for purchase.
      </p>
    </Page>
  );
}
