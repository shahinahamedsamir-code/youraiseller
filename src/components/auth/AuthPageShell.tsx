"use client";

import { CheckCircle2 } from "lucide-react";
import { GoogleAuthProvider } from "@/components/auth/GoogleAuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthSessionRedirect } from "@/components/auth/AuthSessionRedirect";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";

const STEPS = [
  "Sign in with Google",
  "Admin reviews your account",
  "Dashboard unlocks when active",
];

type Props = {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  heroTitle: string;
  heroSubtitle: string;
  footerLink?: { href: string; label: string; text: string };
};

export function AuthPageShell({
  mode,
  title,
  subtitle,
  heroTitle,
  heroSubtitle,
  footerLink,
}: Props) {
  return (
    <GoogleAuthProvider>
      <AuthSessionRedirect />
      <div className="relative min-h-screen overflow-hidden bg-[#f4f6fb]">
        <div
          className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-violet-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex min-h-screen flex-col lg:flex-row">
          {/* Hero */}
          <div className="relative flex flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 via-[#1a2744] to-teal-900 px-8 py-10 text-white lg:px-14 lg:py-12">
            <div className="absolute inset-0 opacity-40" aria-hidden>
              <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[length:24px_24px]" />
            </div>
            <div className="relative z-10">
              <BrandLogo
                size="lg"
                priority
                subtitle="Seller Dashboard"
                textClassName="[&_p:first-child]:text-white [&_p:last-child]:text-teal-300/90 [&_span]:text-teal-300"
              />
            </div>
            <div className="relative mt-10 lg:mt-0">
              <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
                {heroTitle}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300/95 lg:text-base">
                {heroSubtitle}
              </p>
              <ul className="mt-8 hidden space-y-3 lg:block">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-sm text-slate-200">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-teal-300">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative mt-8 text-xs text-slate-500 lg:mt-0">
              © 2026 {BRAND_NAME}
            </p>
          </div>

          {/* Form panel */}
          <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
            <div className="w-full max-w-[420px]">
              <BrandLogo size="sm" subtitle="Seller Dashboard" />

              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
              </div>

              <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 backdrop-blur-sm sm:p-8">
                <GoogleSignInButton
                  label={
                    mode === "signup"
                      ? "Sign up with Google"
                      : "Continue with Google"
                  }
                  variant={mode}
                />

                <ul className="mt-6 space-y-2 border-t border-slate-100 pt-5 lg:hidden">
                  {STEPS.map((step) => (
                    <li
                      key={step}
                      className="flex items-center gap-2 text-xs text-slate-500"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {footerLink && (
                <p className="mt-6 text-center text-sm text-slate-600">
                  {footerLink.text}{" "}
                  <a
                    href={footerLink.href}
                    className="font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    {footerLink.label}
                  </a>
                </p>
              )}

              <p className="mt-4 text-center text-[11px] text-slate-400">
                English · Google sign-in only · No password required
              </p>
            </div>
          </div>
        </div>
      </div>
    </GoogleAuthProvider>
  );
}
