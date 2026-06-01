"use client";

import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function SignupPage() {
  return (
    <AuthPageShell
      mode="signup"
      title="Join as a seller"
      subtitle="One click with Google — we review every new account."
      heroTitle="Start selling with confidence"
      heroSubtitle="Register with Google. Our team approves new sellers, then activates your dashboard when you are ready to go live."
      footerLink={{
        text: "Already registered?",
        href: "/login",
        label: "Sign in",
      }}
    />
  );
}
