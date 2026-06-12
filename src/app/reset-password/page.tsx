"use client";

import { useSearchParams } from "next/navigation";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  return (
    <AuthCardShell
      title="Choose new password"
      subtitle="Pick a new password for your seller account."
      footer={{ text: "Back to", href: "/login", label: "Sign in" }}
    >
      <ResetPasswordForm token={token} />
    </AuthCardShell>
  );
}
