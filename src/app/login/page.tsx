"use client";

import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell
      mode="login"
      title="Welcome back"
      subtitle="Sign in to manage orders, inventory, and web sales."
      heroTitle="Run your store from one smart dashboard"
      heroSubtitle="Connect with Google in seconds. After admin approves your account, you get full access to orders, inventory, and delivery tools."
      footerLink={{
        text: "New seller?",
        href: "/signup",
        label: "Create account",
      }}
    />
  );
}
