// screens/settings.jsx — Comfort & focus. A flat, quiet page.

function SettingsScreen({ tweak, setTweak, navigate }) {
  return (
    <div className="tv-page tv-fade" data-screen-label="Settings">
      <header className="tv-head">
        <div className="tv-head__date">comfort & focus</div>
        <div className="tv-head__clock">settings</div>
      </header>

      <h1 className="tv-display" style={{ fontSize: 28 }}>
        How should the app feel today?
      </h1>
      <p className="tv-prose">
        Nothing here is stored on a server. All settings live on this device. Pick whatever helps right now; change it again later.
      </p>

      <section>
        <div className="tv-label" style={{ paddingTop: 8, paddingBottom: 4 }}>sensory</div>

        <Setting
          name="Theme"
          hint="Paper-light is the default. Lamp is a low-stim warm dark — not pure black."
        >
          <Seg
            options={[{ k: 'daylight', l: 'Daylight' }, { k: 'lamp', l: 'Lamp' }]}
            value={tweak.theme}
            onChange={(v) => setTweak('theme', v)}
          />
        </Setting>

        <Setting
          name="Motion"
          hint="Animations are already minimal. You can remove them entirely."
        >
          <Seg
            options={[{ k: 'full', l: 'Subtle' }, { k: 'off', l: 'None' }]}
            value={tweak.motion}
            onChange={(v) => setTweak('motion', v)}
          />
        </Setting>

        <Setting
          name="Density"
          hint="Roomy if you find dense text overwhelming."
        >
          <Seg
            options={[{ k: 'roomy', l: 'Roomy' }, { k: 'standard', l: 'Standard' }]}
            value={tweak.density}
            onChange={(v) => setTweak('density', v)}
          />
        </Setting>
      </section>

      <section>
        <div className="tv-label" style={{ paddingTop: 16, paddingBottom: 4 }}>language</div>

        <Setting
          name="Voice"
          hint="How the app phrases things. Plain is default. Clinical is for clinicians or coregulators. Warm is more personable."
        >
          <Seg
            options={[
              { k: 'plain', l: 'Plain' },
              { k: 'clinical', l: 'Clinical' },
              { k: 'warm', l: 'Warm' },
            ]}
            value={tweak.voice}
            onChange={(v) => setTweak('voice', v)}
          />
        </Setting>

        <Setting
          name="Time format"
          hint="Clock numbers can be hard to feel. Chunks (morning / afternoon) match how time blindness perceives the day."
        >
          <Seg
            options={[{ k: 'clock', l: 'Clock' }, { k: 'chunks', l: 'Chunks' }]}
            value={tweak.timeFormat}
            onChange={(v) => setTweak('timeFormat', v)}
          />
        </Setting>

        <Setting
          name="Anchor-less days"
          hint="When you open the app without a fixed event in mind."
        >
          <Seg
            options={[
              { k: 'choice',  l: 'Ask me' },
              { k: 'suggest', l: 'Suggest' },
              { k: 'refuse',  l: 'Rest' },
            ]}
            value={tweak.anchorless}
            onChange={(v) => setTweak('anchorless', v)}
          />
        </Setting>
      </section>

      <section>
        <div className="tv-label" style={{ paddingTop: 16, paddingBottom: 4 }}>data & connections</div>

        <Setting
          name="Calendar"
          hint="Connect Google or Microsoft to pull anchors in, or export a chain as .ics."
        >
          <button className="tv-btn tv-btn--quiet" style={{ width: 'auto' }} onClick={() => navigate('calendar')}>
            <span>Open</span>
          </button>
        </Setting>

        <Setting
          name="Travel profiles"
          hint="Reusable location-to-location travel times and lateness overrides."
        >
          <button className="tv-btn tv-btn--quiet" style={{ width: 'auto' }} onClick={() => navigate('travel')}>
            <span>Open</span>
          </button>
        </Setting>

        <Setting
          name="Sign-in"
          hint="Optional. Only used to restore chains between devices."
        >
          <span className="tv-ui-s" style={{ fontStyle: 'italic' }}>signed out</span>
        </Setting>

        <Setting
          name="Habit log"
          hint="Kept around for users mid-migration. Feeds chain padding, never streaks. Will be removed when the new system stabilises."
        >
          <span className="tv-ui-s" style={{ fontStyle: 'italic' }}>legacy</span>
        </Setting>
      </section>

      <div className="tv-card tv-card--quote" style={{ marginTop: 16 }}>
        <div className="tv-label">a note</div>
        <p className="tv-prose" style={{ margin: 0 }}>
          The app does not analytics-log anything. No behavioural model of you is built. The point of this software is that you can stop using it when you no longer need it — not that you stay forever.
        </p>
      </div>

      <div className="tv-actions" style={{ marginTop: 8 }}>
        <button className="tv-btn" onClick={() => navigate('clinical')}>
          <span>Read the clinical reasoning</span>
          <span className="tv-btn__hint">→</span>
        </button>
        <button className="tv-btn tv-btn--ghost" onClick={() => navigate('today')}>
          <span>← back to today</span>
          <span className="tv-btn__hint" />
        </button>
      </div>
    </div>
  );
}

function Setting({ name, hint, children }) {
  return (
    <div className="tv-setting">
      <div className="tv-setting__label">
        <div className="tv-setting__name">{name}</div>
        <div className="tv-setting__hint">{hint}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Seg({ options, value, onChange }) {
  return (
    <div className="tv-seg">
      {options.map(o => (
        <button
          key={o.k}
          aria-pressed={value === o.k}
          onClick={() => onChange(o.k)}
        >{o.l}</button>
      ))}
    </div>
  );
}

Object.assign(window, { SettingsScreen });
