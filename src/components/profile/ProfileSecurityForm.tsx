'use client';

import { useMemo, useState } from 'react';
import { Loader2, LockKeyhole, Mail } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type ProfileSecurityFormProps = {
  email: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function ProfileSecurityForm({ email }: ProfileSecurityFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [nextEmail, setNextEmail] = useState(email || '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const targetEmail = normalizeEmail(nextEmail);
    const currentEmail = normalizeEmail(email || '');

    if (!targetEmail) {
      setEmailError('Email is required.');
      return;
    }

    if (targetEmail === currentEmail) {
      setEmailError('Enter a different email to update your account.');
      return;
    }

    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: targetEmail });

    if (error) {
      setEmailError(error.message);
      setSavingEmail(false);
      return;
    }

    setEmailSuccess(
      'Check your inbox to confirm this email change before it takes effect.'
    );
    setSavingEmail(false);
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (password.length < 8) {
      setPasswordError('Use at least 8 characters for your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Password confirmation does not match.');
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordError(error.message);
      setSavingPassword(false);
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setPasswordSuccess('Password updated.');
    setSavingPassword(false);
  }

  return (
    <section className="rounded-2xl border border-stone/35 bg-white/78 p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-earth">Account Settings</h2>
        <p className="mt-1 text-sm text-bark/55">
          Update your sign-in email and password.
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <label className="block text-xs text-bark/55" htmlFor="account-email">
          Email
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark/45" />
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
              className="w-full rounded-xl border border-stone py-2.5 pl-9 pr-3 text-sm text-earth focus:outline-none focus:ring-2 focus:ring-moss/45"
            />
          </div>
          <button
            type="submit"
            disabled={savingEmail}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-moss to-leaf px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update Email
          </button>
        </div>
        {emailError ? <p className="text-sm text-error">{emailError}</p> : null}
        {emailSuccess ? <p className="text-sm text-moss">{emailSuccess}</p> : null}
      </form>

      <div className="my-5 border-t border-stone/35" />

      <form onSubmit={handlePasswordSubmit} className="space-y-3">
        <label className="block text-xs text-bark/55" htmlFor="account-password">
          New Password
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark/45" />
          <input
            id="account-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-stone py-2.5 pl-9 pr-3 text-sm text-earth focus:outline-none focus:ring-2 focus:ring-moss/45"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-bark/55" htmlFor="account-password-confirm">
            Confirm Password
          </label>
          <input
            id="account-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-stone px-3 py-2.5 text-sm text-earth focus:outline-none focus:ring-2 focus:ring-moss/45"
          />
        </div>
        {passwordError ? <p className="text-sm text-error">{passwordError}</p> : null}
        {passwordSuccess ? <p className="text-sm text-moss">{passwordSuccess}</p> : null}
        <button
          type="submit"
          disabled={savingPassword}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-moss to-leaf px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Update Password
        </button>
      </form>
    </section>
  );
}
