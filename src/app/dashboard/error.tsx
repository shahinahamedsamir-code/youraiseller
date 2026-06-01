"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold text-slate-900">Dashboard failed to load</h1>
      <p className="max-w-md text-sm text-slate-600">
        This is usually a temporary cache issue. Click fix below, then login again.
      </p>
      {error?.message && (
        <p className="max-w-lg rounded-lg bg-rose-50 px-3 py-2 text-left text-xs font-mono text-rose-800">
          {error.message}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white"
        >
          Try Again
        </button>
        <Link
          href="/login"
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
        >
          Login
        </Link>
      </div>
      <p className="text-xs text-slate-400">
        Terminal: <code className="rounded bg-slate-100 px-1">npm run restart</code>
      </p>
    </div>
  );
}
