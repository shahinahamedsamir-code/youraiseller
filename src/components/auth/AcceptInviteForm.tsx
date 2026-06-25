"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

const inputCls =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/15";

type CheckState =
  | { status: "checking" }
  | { status: "valid"; email: string; name: string }
  | { status: "invalid"; error: string };

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [check, setCheck] = useState<CheckState>({ status: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setCheck({ status: "invalid", error: "This invite link is missing its token." });
        return;
      }
      try {
        const res = await fetch(`/api/accept-invite?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setCheck({ status: "invalid", error: data.error ?? "This invite link is invalid." });
          return;
        }
        setCheck({ status: "valid", email: data.email, name: data.name });
      } catch {
        if (!cancelled) {
          setCheck({ status: "invalid", error: "Could not verify this invite. Try again." });
        }
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
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not accept invite.");
      setDone(true);
      setTimeout(() => router.push("/login?invited=1"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite.");
    } finally {
      setLoading(false);
    }
  };

  if (check.status === "checking") {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verifying your invite…
      </div>
    );
  }

  if (check.status === "invalid") {
    return (
      <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-3 text-sm text-amber-900">
        {check.error}
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="text-sm font-semibold text-slate-700">
          All set! Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
        <Mail className="h-4 w-4 text-slate-400" />
        <span className="truncate font-semibold text-slate-700">{check.email}</span>
      </div>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          Create password
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
            Setting up…
          </>
        ) : (
          "Set password & join"
        )}
      </button>
    </form>
  );
}
