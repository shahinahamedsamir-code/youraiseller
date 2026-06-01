"use client";

import { useEffect, useState } from "react";
import { checkDevSession, verifyDevPassword } from "@/lib/dev-auth";
import { Code2, Lock, ShieldAlert } from "lucide-react";

export default function DevAdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkDevSession().then((ok) => {
      if (ok) window.location.replace("/dev-admin");
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (await verifyDevPassword(password)) {
        window.location.replace("/dev-admin");
        return;
      } else {
        setError("Wrong password. Access denied.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600">
            <Code2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Developer Access</h1>
          <p className="mt-2 text-sm text-slate-500">
            Private control panel — not visible to customers
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
        >
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Only software owner should know this URL and password.
          </div>

          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
            <Lock className="h-3.5 w-3.5" /> Dev Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            className="mb-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
            placeholder="Enter dev password"
            autoComplete="off"
          />
          {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-60"
          >
            {loading ? "Checking…" : "Unlock Dev Panel"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Customers use{" "}
          <a href="/login" className="text-teal-500 hover:underline">
            /login
          </a>{" "}
          — not this page.
        </p>
      </div>
    </div>
  );
}
