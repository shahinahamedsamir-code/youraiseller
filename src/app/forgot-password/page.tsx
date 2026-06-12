"use client";

import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCardShell
      title="Reset password"
      subtitle="Enter your account email. We will send a link to set a new password."
      footer={{ text: "Remember your password?", href: "/login", label: "Sign in" }}
    >
      <ForgotPasswordForm />
    </AuthCardShell>
  );
}
