"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, Lock, Mail, Store, User } from "lucide-react";
import { applyServerAuthUser, syncDevUsersFromServer } from "@/lib/dev-users";

type Props = {
  mode: "login" | "signup";
};

const inputCls =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/15";

export function EmailPasswordAuthForm({ mode }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password,
          name: mode === "signup" ? name : undefined,
          company: mode === "signup" ? company : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");

      if (data.user?.id) {
        applyServerAuthUser(data.user);
      }
      await syncDevUsersFromServer(true);

      if (data.redirect === "dashboard") {
        router.push("/dashboard");
      } else {
        router.push("/renew");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === "signup" ? (
        <>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <User className="h-3.5 w-3.5" />
              Your name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              className={inputCls}
              placeholder="Rahim Uddin"
              autoComplete="name"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Store className="h-3.5 w-3.5" />
              Business name
            </span>
            <input
              type="text"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setError("");
              }}
              className={inputCls}
              placeholder="My Store BD"
              autoComplete="organization"
            />
          </label>
        </>
      ) : null}

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Mail className="h-3.5 w-3.5" />
          Email
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

      <label className="block">
        <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Password
          </span>
          {mode === "login" ? (
            <Link
              href="/forgot-password"
              className="normal-case tracking-normal text-violet-600 hover:text-violet-700 hover:underline"
            >
              Forgot password?
            </Link>
          ) : null}
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          className={inputCls}
          placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 6 : undefined}
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
          "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-white shadow-sm transition",
          "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
          "disabled:cursor-not-allowed disabled:opacity-70"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === "signup" ? "Creating account…" : "Signing in…"}
          </>
        ) : mode === "signup" ? (
          "Create account with email"
        ) : (
          "Sign in with email"
        )}
      </button>
    </form>
  );
}
