// app.jsx — root, router, tweaks wiring.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "daylight",
  "motion": "full",
  "density": "standard",
  "voice": "plain",
  "timeFormat": "clock",
  "anchorless": "choice",
  "keystoneMark": true,
  "showNameBanner": false,
  "viewName": "Today",
  "openWith": "timeline",
  "startRoute": "auth",
  "platform": "mobile",
  "network": "online",
  "installState": "promptable",
  "maxLateMinutes": 0,
  "onboardingPhase": "1",
  "todayError": false,
  "authMode": "signup",
  "authState": "idle"
}/*EDITMODE-END*/;

const ROUTES = [
  { k: 'today',        l: 'Today',     desc: 'live runtime' },
  { k: 'plan',         l: 'Plan',      desc: 'build a chain' },
  { k: 'empty',        l: 'No anchor', desc: 'anchor-less' },
  { k: 'onboarding',   l: 'Intro',     desc: 'first run' },
  { k: 'clinical',     l: 'Clinical',  desc: 'NHS surface' },
  { k: 'settings',     l: 'Settings',  desc: 'comfort & focus' },
];

// Reachable from Settings/entry, not shown in primary nav (footer/sidebar) —
// matches the IA-collapse target (Today · Plan · Clinical · Settings only).
const HIDDEN_ROUTES = ['travel', 'calendar', 'auth'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState(t.startRoute || 'today');

  // Apply theme + density + motion globally
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', t.theme);
    root.setAttribute('data-motion', t.motion);
    root.setAttribute('data-platform', t.platform);
    root.style.setProperty('--density', t.density === 'roomy' ? '1.15' : '1');
  }, [t.theme, t.motion, t.density, t.platform]);

  const navigate = (r) => {
    // synthetic routes used by some screens
    if (r === 'empty-refuse') {
      setTweak('anchorless', 'refuse');
      setRoute('empty');
      return;
    }
    if (r === 'today-fresh') {
      setTweak('openWith', 'timeline');
      setRoute('today');
      return;
    }
    setRoute(r);
  };

  const screen = (
    route === 'today'      ? <TodayScreen tweak={t} navigate={navigate} /> :
    route === 'plan'       ? <PlanScreen tweak={t} navigate={navigate} /> :
    route === 'empty'      ? <EmptyScreen tweak={t} navigate={navigate} /> :
    route === 'onboarding' ? <OnboardingScreen tweak={t} navigate={navigate} /> :
    route === 'auth'       ? <AuthScreen tweak={t} setTweak={setTweak} navigate={navigate} /> :
    route === 'clinical'   ? <ClinicalScreen navigate={navigate} /> :
    route === 'settings'   ? <SettingsScreen tweak={t} setTweak={setTweak} navigate={navigate} /> :
    route === 'travel'     ? <TravelScreen navigate={navigate} /> :
    route === 'calendar'   ? <CalendarScreen tweak={t} navigate={navigate} /> :
    <TodayScreen tweak={t} navigate={navigate} />
  );

  const appBody = (
    <div className="tv-app" data-platform={t.platform}>
      {t.platform === 'desktop' && <Sidebar route={route} setRoute={setRoute} />}
      <div className="tv-content">
        {screen}
      </div>
      {t.platform === 'mobile' && <Footer route={route} setRoute={setRoute} />}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Aesthetic" />
        <TweakRadio
          label="Platform"
          value={t.platform}
          options={['mobile', 'desktop']}
          onChange={(v) => setTweak('platform', v)}
        />
        <TweakRadio
          label="Theme"
          value={t.theme}
          options={['daylight', 'lamp']}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakRadio
          label="Motion"
          value={t.motion}
          options={['full', 'off']}
          onChange={(v) => setTweak('motion', v)}
        />
        <TweakRadio
          label="Density"
          value={t.density}
          options={['standard', 'roomy']}
          onChange={(v) => setTweak('density', v)}
        />

        <TweakSection label="Language" />
        <TweakRadio
          label="Voice register"
          value={t.voice}
          options={['plain', 'clinical', 'warm']}
          onChange={(v) => setTweak('voice', v)}
        />
        <TweakRadio
          label="Time format"
          value={t.timeFormat}
          options={['clock', 'chunks']}
          onChange={(v) => setTweak('timeFormat', v)}
        />

        <TweakSection label="Anchor-less day" />
        <TweakRadio
          label="Default"
          value={t.anchorless}
          options={['choice', 'suggest', 'refuse']}
          onChange={(v) => setTweak('anchorless', v)}
        />

        <TweakSection label="Today screen" />
        <TweakToggle
          label="Keystone margin mark"
          value={t.keystoneMark}
          onChange={(v) => setTweak('keystoneMark', v)}
        />
        <TweakToggle
          label="Show view-name candidates"
          value={t.showNameBanner}
          onChange={(v) => setTweak('showNameBanner', v)}
        />
        <TweakSelect
          label="View name"
          value={t.viewName}
          options={['Today', 'Now', 'Runway', 'The Hours']}
          onChange={(v) => setTweak('viewName', v)}
        />

        <TweakSection label="Demo" />
        <TweakSelect
          label="Open Today as"
          value={t.openWith}
          options={['timeline', 'declare', 'triage', 'helpful']}
          onChange={(v) => setTweak('openWith', v)}
        />
        <TweakSelect
          label="Start route"
          value={t.startRoute}
          options={['today', 'plan', 'empty', 'onboarding', 'clinical', 'settings', 'travel', 'calendar', 'auth']}
          onChange={(v) => { setTweak('startRoute', v); setRoute(v); }}
        />

        <TweakSection label="Timing model" />
        <TweakSelect
          label="Max late override"
          value={String(t.maxLateMinutes)}
          options={['0', '5', '10']}
          onChange={(v) => setTweak('maxLateMinutes', Number(v))}
        />

        <TweakSection label="Mobile / PWA" />
        <TweakRadio
          label="Network"
          value={t.network}
          options={['online', 'flaky', 'offline']}
          onChange={(v) => setTweak('network', v)}
        />
        <TweakRadio
          label="Install banner"
          value={t.installState}
          options={['promptable', 'installed']}
          onChange={(v) => setTweak('installState', v)}
        />
        <TweakToggle
          label="Force error boundary"
          value={t.todayError}
          onChange={(v) => setTweak('todayError', v)}
        />

        <TweakSection label="Onboarding" />
        <TweakRadio
          label="Preset phase"
          value={t.onboardingPhase}
          options={['1', '2']}
          onChange={(v) => setTweak('onboardingPhase', v)}
        />

        <TweakSection label="Account" />
        <TweakRadio
          label="Auth mode"
          value={t.authMode}
          options={['signin', 'signup']}
          onChange={(v) => setTweak('authMode', v)}
        />
        <TweakRadio
          label="Auth state"
          value={t.authState}
          options={['idle', 'loading', 'error', 'success']}
          onChange={(v) => setTweak('authState', v)}
        />
      </TweaksPanel>
    </div>
  );

  // The device frame wraps the SAME App instance's output — platform switches
  // never remount App, so tweak state (owned here via useTweaks) survives.
  return (
    <DeviceFrame platform={t.platform} dark={t.theme === 'lamp'}>
      {appBody}
    </DeviceFrame>
  );
}

function Footer({ route, setRoute }) {
  return (
    <nav className="tv-footer" aria-label="primary">
      {ROUTES.map(r => (
        <button
          key={r.k}
          aria-current={route === r.k ? 'true' : 'false'}
          onClick={() => setRoute(r.k)}
          title={r.desc}
        >{r.l}</button>
      ))}
    </nav>
  );
}

function Sidebar({ route, setRoute }) {
  return (
    <div className="tv-sidebar">
      <div className="tv-sidebar__mark">traverse</div>
      <nav aria-label="primary">
        {ROUTES.map(r => (
          <button
            key={r.k}
            aria-current={route === r.k ? 'true' : 'false'}
            onClick={() => setRoute(r.k)}
            title={r.desc}
          >{r.l}</button>
        ))}
      </nav>
    </div>
  );
}

function DeviceFrame({ children, platform, dark }) {
  // Kept as a plain wrapper (no state of its own) so it never forces a
  // remount of its children when `platform` flips — App above owns all
  // tweak state and must stay mounted across the switch.
  if (platform === 'desktop') {
    return (
      <ChromeWindow width={1280} height={800} url="traverse.app/today">
        <div style={{ minHeight: '100%', background: dark ? '#15130f' : '#fff' }}>{children}</div>
      </ChromeWindow>
    );
  }
  return (
    <IOSDevice width={402} height={874} dark={dark}>
      <div style={{ minHeight: '100%' }}>{children}</div>
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
