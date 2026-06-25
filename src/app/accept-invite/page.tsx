"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";

function AcceptInviteContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  return (
    <AuthCardShell
      title="Accept your invite"
      subtitle="Set a password to join your team's seller dashboard."
      footer={{ text: "Already set up?", href: "/login", label: "Sign in" }}
    >
      <AcceptInviteForm token={token} />
    </AuthCardShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <AuthCardShell
          title="Accept your invite"
          subtitle="Loading your invite…"
          footer={{ text: "Already set up?", href: "/login", label: "Sign in" }}
        >
          <p className="text-sm text-slate-500">Please wait…</p>
        </AuthCardShell>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
