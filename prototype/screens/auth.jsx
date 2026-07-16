// screens/auth.jsx — sign in / sign up. The account exists to hold onboarding
// presets, calendar links, and travel profiles across devices — nothing else.

const OAUTH_PROVIDERS = [
  { k: 'google',    label: 'Continue with Google' },
  { k: 'apple',     label: 'Continue with Apple' },
  { k: 'microsoft', label: 'Continue with Microsoft' },
];

function ProviderMark({ k }) {
  // Plain monochrome marks — a letterform, not a brand logotype.
  const ch = { google: 'G', apple: 'A', microsoft: '\u25A6' }[k] || '?';
  return <span className="tv-oauth__mark" aria-hidden="true">{ch}</span>;
}

function AuthScreen({ tweak, setTweak, navigate }) {
  const mode = tweak?.authMode === 'signup' ? 'signup' : 'signin';
  const state = tweak?.authState || 'idle';
  const [reset, setReset] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    if (state === 'success') {
      const t = setTimeout(() => {
        setTweak('authState', 'idle');
        navigate(mode === 'signup' ? 'onboarding' : 'today');
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [state, mode]);

  const setMode = (m) => { setTweak('authMode', m); setTweak('authState', 'idle'); setReset(false); };
  const submit = (e) => { e.preventDefault(); setTweak('authState', 'loading'); };
  const oauth = () => setTweak('authState', 'loading');

  if (state === 'success') {
    return (
      <div className="tv-page tv-fade" data-screen-label="Auth · Success">
        <header className="tv-head">
          <div className="tv-head__date">traverse · account</div>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', minHeight: 320 }}>
          <div className="tv-label">you're in</div>
          <h1 className="tv-display" style={{ fontSize: 26, textAlign: 'center' }}>
            {mode === 'signup' ? 'Account created.' : 'Welcome back.'}
          </h1>
          <p className="tv-prose" style={{ textAlign: 'center' }}>
            {mode === 'signup' ? 'On to five short questions.' : 'Taking you to today.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-page tv-fade" data-screen-label={`Auth · ${reset ? 'Reset' : mode}`}>
      <header className="tv-head">
        <div className="tv-head__date">traverse · account</div>
      </header>

      {reset ? (
        <React.Fragment>
          <div className="tv-label">reset password</div>
          <h1 className="tv-display" style={{ fontSize: 26 }}>Get a reset link.</h1>
          <p className="tv-prose">We'll email a link to sign back in and set a new password.</p>
          <form className="tv-form" onSubmit={submit}>
            <Field label="email" type="email" value={email} onChange={setEmail} placeholder="you@domain.com" />
            <button className="tv-btn tv-btn--primary" type="submit" disabled={state === 'loading'}>
              <span>{state === 'loading' ? 'Sending…' : 'Send reset link'}</span>
              <span className="tv-btn__hint">{state === 'loading' ? '' : '→'}</span>
            </button>
          </form>
          <button className="tv-btn tv-btn--ghost" onClick={() => { setReset(false); setTweak('authState', 'idle'); }}>
            <span>← back to sign in</span>
          </button>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <div className="tv-seg" style={{ alignSelf: 'flex-start' }}>
            <button aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>Sign in</button>
            <button aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>Create account</button>
          </div>

          <h1 className="tv-display" style={{ fontSize: 28 }}>
            {mode === 'signup' ? 'One account, everything carried forward.' : 'Good to see you again.'}
          </h1>
          <p className="tv-prose">
            {mode === 'signup'
              ? 'Your keystone, your hours, your travel profiles — kept so the next device picks up where this one left off.'
              : 'Sign back in to pick up your chains, presets, and any calendar links.'}
          </p>

          <div className="tv-actions">
            {OAUTH_PROVIDERS.map(p => (
              <button key={p.k} className="tv-btn tv-oauth" onClick={oauth} disabled={state === 'loading'}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ProviderMark k={p.k} /><span>{p.label}</span>
                </span>
                <span className="tv-btn__hint">{state === 'loading' ? '…' : '→'}</span>
              </button>
            ))}
          </div>

          <div className="tv-divider"><span>or with email</span></div>

          <form className="tv-form" onSubmit={submit}>
            {mode === 'signup' && (
              <Field label="name" type="text" value={name} onChange={setName} placeholder="Optional" />
            )}
            <Field label="email" type="email" value={email} onChange={setEmail} placeholder="you@domain.com" required />
            <Field label="password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />

            {mode === 'signin' && (
              <button type="button" className="tv-btn tv-btn--ghost" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => setReset(true)}>
                <span>Forgot your password?</span>
              </button>
            )}

            {state === 'error' && (
              <div className="tv-field-error">
                {mode === 'signup' ? 'That email is already in use — try signing in instead.' : 'Wrong email or password. Try again.'}
              </div>
            )}

            <button className="tv-btn tv-btn--primary" type="submit" disabled={state === 'loading'}>
              <span>{state === 'loading' ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}</span>
              <span className="tv-btn__hint">{state === 'loading' ? '' : (mode === 'signup' ? '→ phase one' : '→ today')}</span>
            </button>
          </form>

          <p className="tv-foot-note">
            An account holds your onboarding presets, calendar links, and travel profiles across devices — and is where consent lives if you ever connect an NHS-linked calendar. Nothing here is sold or shared.
          </p>
        </React.Fragment>
      )}
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, required }) {
  const id = 'f-' + label.replace(/\s+/g, '-');
  return (
    <label className="tv-field" htmlFor={id}>
      <span className="tv-field__label">{label}</span>
      <input
        id={id}
        className="tv-field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

Object.assign(window, { AuthScreen });
