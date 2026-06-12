"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import {
  changeAccountPassword,
  getSessionUser,
  setAccountPassword,
  type DevUser,
} from "@/lib/dev-users";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100";

export function AccountPasswordPanel() {
  const [user, setUser] = useState<DevUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getSessionUser() ?? null);
  }, []);

  const hasPassword = Boolean(user?.passwordHash);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setMsg("");
    const result = hasPassword
      ? changeAccountPassword(user.id, currentPassword, newPassword)
      : setAccountPassword(user.id, newPassword);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setUser(getSessionUser() ?? null);
    setMsg(hasPassword ? "Password updated successfully." : "Password set. You can now sign in with email.");
  };

  if (!user) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Sign in to manage your password.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Security</h1>
            <p className="mt-1 text-sm text-slate-300">Password &amp; sign-in methods</p>
          </div>
        </div>
      </div>

      <div className="yai-panel p-5">
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
          Signed in as <strong className="text-slate-900">{user.email}</strong>
          <span className="text-slate-300">·</span>
          {user.authProvider === "google" && !user.passwordHash ? (
            <span className="inline-flex items-center gap-1 text-sky-700">
              <Mail className="h-3.5 w-3.5" /> Google login
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-700">
              <KeyRound className="h-3.5 w-3.5" /> Email + password
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {hasPassword ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Current password
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError("");
                }}
                className={inputCls}
                autoComplete="current-password"
                required
              />
            </label>
          ) : (
            <p className="text-sm text-slate-500">
              No password yet. Set one to sign in with email on any device.
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              New password
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
              }}
              className={inputCls}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Confirm new password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              className={inputCls}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          {msg ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {msg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500",
              "disabled:cursor-not-allowed disabled:opacity-70"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {hasPassword ? "Update password" : "Set password"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-semibold text-violet-600 hover:underline">
            Reset from login page
          </Link>
        </p>
      </div>
    </div>
  );
}
