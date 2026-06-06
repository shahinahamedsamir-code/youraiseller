"use client";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { BRAND_NAME } from "@/lib/brand";

export default function SignupPage() {
  return (
    <AuthPageShell
      mode="signup"
      title="Join as a seller"
      heroTitle={BRAND_NAME}
      footerLink={{
        text: "Already registered?",
        href: "/login",
        label: "Sign in",
      }}
    />
  );
}
