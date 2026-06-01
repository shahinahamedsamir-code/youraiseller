"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { refreshCurrentSessionUser } from "@/lib/dev-users";

export function AccountGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "no-session">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await refreshCurrentSessionUser();
      if (cancelled) return;
      if (!user) {
        setState("no-session");
        router.replace("/login");
        return;
      }
      if (user.status !== "active") {
        router.replace("/renew");
        return;
      }
      setState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "ok") {
    return <>{children}</>;
  }

  if (state === "no-session") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-600">Please sign in to open the dashboard.</p>
        <Link
          href="/login"
          className="rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-bold text-white"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Loading dashboard…
    </div>
  );
}
