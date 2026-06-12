"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { KeyRound, Loader2, Lock, Mail } from "lucide-react";

const inputCls =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/15";

type Props = {
  token: string;
  email?: string;
};

export function ResetPasswordForm({ token, email = "" }: Props) {
  const router = useRouter();
  const [accountEmail, setAccountEmail] = useState(email);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (!res.ok && !cancelled) {
          setLinkError(data.error ?? "This reset link is no longer valid.");
        }
      } catch {
        if (!cancelled) {
          setLinkError("Could not verify this reset link. Try again or request a new one.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token && !accountEmail.trim()) {
      setError("Account email is required.");
      return;
    }
    if (!token && !/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit reset code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          token
            ? { token, password }
            : { email: accountEmail, otp: otp.trim(), password }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (token && checking) {
    return <p className="text-sm text-slate-500">Checking reset link…</p>;
  }

  if (token && linkError) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          {linkError}
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex text-sm font-semibold text-violet-600 hover:text-violet-700 hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!token ? (
        <>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              Account email
            </span>
            <input
              type="email"
              value={accountEmail}
              onChange={(e) => {
                setAccountEmail(e.target.value);
                setError("");
              }}
              className={inputCls}
              placeholder="you@store.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <KeyRound className="h-3.5 w-3.5" />
              6-digit reset code
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              className={inputCls}
              placeholder="123456"
              autoComplete="one-time-code"
              required
            />
          </label>
        </>
      ) : null}

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          New password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          className={inputCls}
          placeholder="At least 8 characters, letters + numbers"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          Confirm password
        </span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError("");
          }}
          className={inputCls}
          placeholder="Repeat password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className={clsx(
          "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-white",
          "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400",
          "disabled:cursor-not-allowed disabled:opacity-70"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating…
          </>
        ) : (
          "Update password"
        )}
      </button>
    </form>
  );
}
