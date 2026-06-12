"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  return (
    <AuthCardShell
      title="Choose new password"
      subtitle={
        token
          ? "Pick a new password for your seller account."
          : "Enter the 6-digit code from your email and choose a new password."
      }
      footer={{ text: "Back to", href: "/login", label: "Sign in" }}
    >
      <ResetPasswordForm token={token} email={email} />
    </AuthCardShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCardShell
          title="Choose new password"
          subtitle="Loading reset form…"
          footer={{ text: "Back to", href: "/login", label: "Sign in" }}
        >
          <p className="text-sm text-slate-500">Please wait…</p>
        </AuthCardShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
