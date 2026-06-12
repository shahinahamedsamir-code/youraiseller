"use client";

import { useState } from "react";
import clsx from "clsx";
import { Loader2, Mail } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const inputCls =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/15";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetOtp("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessage(data.message ?? "Check your email for reset instructions.");
      setSubmittedEmail(email.trim());
      if (!data.emailSent && data.resetOtp) setResetOtp(data.resetOtp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (message) {
    return (
      <div className="space-y-5">
        <div className="space-y-2 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <p>{message}</p>
          <p className="text-xs text-emerald-800/90">
            Enter the OTP below. New password fields will appear after the code is verified.
          </p>
          {resetOtp ? (
            <>
              <p className="text-xs text-emerald-800/90">
                SMTP not set in .env.local — use this dev reset code:
              </p>
              <p className="text-lg font-extrabold tracking-[0.25em] text-violet-700">
                {resetOtp}
              </p>
            </>
          ) : null}
        </div>

        <ResetPasswordForm email={submittedEmail} hideEmailInput />

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setResetOtp("");
            setError("");
          }}
          className="text-sm font-semibold text-violet-600 hover:text-violet-700 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Mail className="h-3.5 w-3.5" />
          Account email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          className={inputCls}
          placeholder="you@store.com"
          autoComplete="email"
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
            Sending…
          </>
        ) : (
          "Send reset code"
        )}
      </button>
    </form>
  );
}
