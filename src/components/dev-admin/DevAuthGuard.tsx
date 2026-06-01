"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkDevSession } from "@/lib/dev-auth";

export function DevAuthGuard({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await checkDevSession();
      if (cancelled) return;
      if (ok) {
        setAllowed(true);
        return;
      }
      setAllowed(false);
      window.location.replace("/dev-admin/login");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (allowed === true) {
    return <>{children}</>;
  }

  if (allowed === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <p className="text-slate-400">Dev login required.</p>
        <Link
          href="/dev-admin/login"
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500"
        >
          Go to Dev Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500">
      Verifying access…
    </div>
  );
}
