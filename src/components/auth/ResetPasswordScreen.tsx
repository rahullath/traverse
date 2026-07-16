// src/components/auth/ResetPasswordScreen.tsx — set a new password from a reset-link session.
// The request step ("send me a link") lives inline in AuthScreen; this screen only
// ever runs after Supabase has already exchanged that link for a recovery session.
import React, { useState } from "react";
import { authClient } from "../../lib/auth/config";
import { validatePassword } from "../../lib/auth/validation";
import { mapSupabaseError } from "../../lib/auth/errors";
import { withNetworkAwareRetry } from "../../lib/auth/retry";
import { Display, Label, Prose } from "../tv";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

function Field({ label, value, onChange, placeholder, autoComplete }: FieldProps) {
  const id = "f-" + label.replace(/\s+/g, "-");
  return (
    <label className="tv-field" htmlFor={id}>
      <span className="tv-field__label">{label}</span>
      <input
        id={id}
        className="tv-field__input"
        type="password"
        value={value}
        placeholder={placeholder}
        required
        minLength={8}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

type Status = "idle" | "loading" | "success";

export function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStatus("loading");
    try {
      await withNetworkAwareRetry(async () => {
        const { error: updateError } = await authClient.auth.updateUser({
          password: newPassword,
        });
        if (updateError) throw mapSupabaseError(updateError);
      });
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1800);
    } catch (err) {
      setStatus("idle");
      setError(
        (err as { userMessage?: string })?.userMessage ||
          "Couldn't update your password. Try again.",
      );
    }
  };

  if (status === "success") {
    return (
      <div className="tv-app">
        <div className="tv-page tv-fade" data-screen-label="Reset · Success">
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
            <Label>password updated</Label>
            <Display style={{ fontSize: 26, textAlign: "center" }}>You're set.</Display>
            <Prose style={{ textAlign: "center" }}>Taking you to sign in.</Prose>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-app">
      <div className="tv-page tv-fade" data-screen-label="Reset · Update">
        <header className="tv-head">
          <div className="tv-head__date">traverse · account</div>
        </header>

        <Label>reset password</Label>
        <Display style={{ fontSize: 26 }}>Set a new password.</Display>
        <Prose>Pick something you haven't used here before.</Prose>

        <form className="tv-form" onSubmit={submit}>
          <Field
            label="new password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <Field
            label="confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {error && <div className="tv-field-error">{error}</div>}

          <button className="tv-btn tv-btn--primary" type="submit" disabled={status === "loading"}>
            <span>{status === "loading" ? "Updating…" : "Update password"}</span>
            <span className="tv-btn__hint">{status === "loading" ? "" : "→"}</span>
          </button>
        </form>

        <p className="tv-foot-note">
          This link only works once. If it's expired, go back to sign in and request a new one.
        </p>
      </div>
    </div>
  );
}
