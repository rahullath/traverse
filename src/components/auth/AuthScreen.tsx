// src/components/auth/AuthScreen.tsx — sign in / sign up. The account exists to
// hold onboarding presets, calendar links, and travel profiles across devices.
import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../../lib/auth/context";
import { authClient } from "../../lib/auth/config";
import { mapSupabaseError } from "../../lib/auth/errors";
import type { OAuthProvider } from "../../lib/auth/types";
import { Display, Label, Prose, Seg } from "../tv";

const OAUTH_PROVIDERS: { k: OAuthProvider; label: string; mark: string }[] = [
  { k: "google", label: "Continue with Google", mark: "G" },
  { k: "apple", label: "Continue with Apple", mark: "" },
  { k: "github", label: "Continue with GitHub", mark: "▦" },
];

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

function Field({ label, type, value, onChange, placeholder, required, autoComplete }: FieldProps) {
  const id = "f-" + label.replace(/\s+/g, "-");
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
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

type Mode = "signin" | "signup";
type Status = "idle" | "loading" | "success";

interface AuthScreenInnerProps {
  redirectTo: string;
}

function AuthScreenInner({ redirectTo }: AuthScreenInnerProps) {
  const { user, isLoading, isAuthenticated, error, signInWithEmail, signUpWithEmail, signInWithOAuth } = useAuth();

  const [mode, setModeState] = useState<Mode>("signin");
  const [status, setStatus] = useState<Status>("idle");
  const [reset, setReset] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, user, redirectTo]);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      window.location.href = mode === "signup" ? "/onboarding" : redirectTo;
    }, 1400);
    return () => clearTimeout(t);
  }, [status, mode, redirectTo]);

  const setMode = (m: string) => {
    setModeState(m === "signup" ? "signup" : "signin");
    setStatus("idle");
    setLocalError(null);
    setReset(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setLocalError(null);
    const account =
      mode === "signup"
        ? await signUpWithEmail(email, password, name.trim() || undefined)
        : await signInWithEmail(email, password);
    if (account) {
      setStatus("success");
    } else {
      setStatus("idle");
      setLocalError(
        error ||
          (mode === "signup"
            ? "Could not create that account. Try again."
            : "Wrong email or password. Try again."),
      );
    }
  };

  const oauth = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    setLocalError(null);
    const result = await signInWithOAuth(provider);
    if (result?.url) {
      window.location.href = result.url;
      return;
    }
    setOauthLoading(null);
    setLocalError(error || `Could not start ${provider} sign-in.`);
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus("loading");
    setLocalError(null);
    const { error: resetError } = await authClient.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password?mode=update`,
    });
    if (resetError) {
      setResetStatus("idle");
      setLocalError(mapSupabaseError(resetError).userMessage);
    } else {
      setResetStatus("sent");
    }
  };

  if (isLoading && !isAuthenticated) {
    return (
      <div className="tv-app">
        <div className="tv-page tv-fade">
          <Label>traverse · account</Label>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="tv-app">
        <div className="tv-page tv-fade" data-screen-label="Auth · Success">
          <header className="tv-head">
            <div className="tv-head__date">traverse · account</div>
          </header>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-3)",
              minHeight: 320,
            }}
          >
            <Label>you're in</Label>
            <Display style={{ fontSize: 26, textAlign: "center" }}>
              {mode === "signup" ? "Account created." : "Welcome back."}
            </Display>
            <Prose style={{ textAlign: "center" }}>
              {mode === "signup" ? "On to five short questions." : "Taking you to today."}
            </Prose>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-app">
      <div className="tv-page tv-fade" data-screen-label={`Auth · ${reset ? "Reset" : mode}`}>
        <header className="tv-head">
          <div className="tv-head__date">traverse · account</div>
        </header>

        {reset ? (
          resetStatus === "sent" ? (
            <React.Fragment>
              <Label>reset password</Label>
              <Display style={{ fontSize: 26 }}>Check your email.</Display>
              <Prose>
                We sent a reset link to {resetEmail}. Follow it to set a new password and sign back in.
              </Prose>
              <button
                className="tv-btn tv-btn--ghost"
                onClick={() => {
                  setReset(false);
                  setResetStatus("idle");
                }}
              >
                <span>← back to sign in</span>
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Label>reset password</Label>
              <Display style={{ fontSize: 26 }}>Get a reset link.</Display>
              <Prose>We'll email a link to sign back in and set a new password.</Prose>
              <form className="tv-form" onSubmit={submitReset}>
                <Field
                  label="email"
                  type="email"
                  value={resetEmail}
                  onChange={setResetEmail}
                  placeholder="you@domain.com"
                  required
                  autoComplete="email"
                />
                {localError && <div className="tv-field-error">{localError}</div>}
                <button className="tv-btn tv-btn--primary" type="submit" disabled={resetStatus === "loading"}>
                  <span>{resetStatus === "loading" ? "Sending…" : "Send reset link"}</span>
                  <span className="tv-btn__hint">{resetStatus === "loading" ? "" : "→"}</span>
                </button>
              </form>
              <button
                className="tv-btn tv-btn--ghost"
                onClick={() => {
                  setReset(false);
                  setLocalError(null);
                }}
              >
                <span>← back to sign in</span>
              </button>
            </React.Fragment>
          )
        ) : (
          <React.Fragment>
            <div style={{ alignSelf: "flex-start" }}>
              <Seg value={mode} options={[{ value: "signin", label: "Sign in" }, { value: "signup", label: "Create account" }]} onChange={setMode} />
            </div>

            <Display style={{ fontSize: 28 }}>
              {mode === "signup" ? "One account, everything carried forward." : "Good to see you again."}
            </Display>
            <Prose>
              {mode === "signup"
                ? "Your keystone, your hours, your travel profiles — kept so the next device picks up where this one left off."
                : "Sign back in to pick up your chains, presets, and any calendar links."}
            </Prose>

            <div className="tv-actions">
              {OAUTH_PROVIDERS.map((p) => (
                <button
                  key={p.k}
                  className="tv-btn tv-oauth"
                  onClick={() => oauth(p.k)}
                  disabled={oauthLoading !== null}
                  type="button"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="tv-oauth__mark" aria-hidden="true">
                      {p.mark}
                    </span>
                    <span>{p.label}</span>
                  </span>
                  <span className="tv-btn__hint">{oauthLoading === p.k ? "…" : "→"}</span>
                </button>
              ))}
            </div>

            <div className="tv-divider">
              <span>or with email</span>
            </div>

            <form className="tv-form" onSubmit={submit}>
              {mode === "signup" && (
                <Field label="name" type="text" value={name} onChange={setName} placeholder="Optional" autoComplete="name" />
              )}
              <Field
                label="email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@domain.com"
                required
                autoComplete="email"
              />
              <Field
                label="password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />

              {mode === "signin" && (
                <button
                  type="button"
                  className="tv-btn tv-btn--ghost"
                  style={{ alignSelf: "flex-start", padding: 0 }}
                  onClick={() => setReset(true)}
                >
                  <span>Forgot your password?</span>
                </button>
              )}

              {status === "idle" && localError && <div className="tv-field-error">{localError}</div>}

              <button className="tv-btn tv-btn--primary" type="submit" disabled={status === "loading"}>
                <span>
                  {status === "loading"
                    ? mode === "signup"
                      ? "Creating account…"
                      : "Signing in…"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </span>
                <span className="tv-btn__hint">
                  {status === "loading" ? "" : mode === "signup" ? "→ phase one" : "→ today"}
                </span>
              </button>
            </form>

            <p className="tv-foot-note">
              An account holds your onboarding presets, calendar links, and travel profiles across devices — and is
              where consent lives if you ever connect an NHS-linked calendar. Nothing here is sold or shared.
            </p>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

interface AuthScreenProps {
  redirectTo?: string;
}

export function AuthScreen({ redirectTo = "/today" }: AuthScreenProps) {
  return (
    <AuthProvider>
      <AuthScreenInner redirectTo={redirectTo} />
    </AuthProvider>
  );
}
