"use client";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { BRAND_NAME } from "@/lib/brand";

export default function LoginPage() {
  return (
    <AuthPageShell
      mode="login"
      title="Welcome back"
      heroTitle={BRAND_NAME}
      footerLink={{
        text: "New seller?",
        href: "/signup",
        label: "Create account",
      }}
    />
  );
}
