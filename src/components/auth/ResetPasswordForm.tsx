"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";

const inputCls =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/15";

type Props = {
  email?: string;
  hideEmailInput?: boolean;
};

export function ResetPasswordForm({ email = "", hideEmailInput = false }: Props) {
  const router = useRouter();
  const [accountEmail, setAccountEmail] = useState(email);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const validateOtpFields = () => {
    if (!accountEmail.trim()) {
      setError("Account email is required.");
      return false;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit reset code from your email.");
      return false;
    }
    return true;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOtpFields()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: accountEmail,
          otp: otp.trim(),
          verifyOnly: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOtpFields()) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, otp: otp.trim(), password }),
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

  const showEmailInput = !hideEmailInput || !accountEmail.trim();

  return (
    <form onSubmit={verified ? handleSubmit : handleVerify} className="space-y-4">
      {!verified && showEmailInput ? (
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
      ) : null}

      {!verified ? (
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
      ) : null}

      {!verified ? (
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
              Verifying…
            </>
          ) : (
            "Verify code"
          )}
        </button>
      ) : null}

      {verified ? (
        <p className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          Code verified. Now choose your new password.
        </p>
      ) : null}

      {verified ? (
        <>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              New password
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={clsx(inputCls, "pr-12")}
                placeholder="At least 8 characters, letters + numbers"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              Confirm password
            </span>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                className={clsx(inputCls, "pr-12")}
                placeholder="Repeat password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
        </>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {verified ? (
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
      ) : null}
    </form>
  );
}
