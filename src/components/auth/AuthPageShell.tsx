"use client";

import {
  BarChart3,
  MessageSquare,
  Package,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { GoogleAuthProvider } from "@/components/auth/GoogleAuthProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthSessionRedirect } from "@/components/auth/AuthSessionRedirect";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";

const HIGHLIGHTS = [
  { icon: ShoppingCart, label: "Orders", tone: "from-violet-500/20 to-violet-500/5" },
  { icon: Package, label: "Inventory", tone: "from-cyan-500/20 to-cyan-500/5" },
  { icon: Truck, label: "Courier", tone: "from-teal-500/20 to-teal-500/5" },
  { icon: MessageSquare, label: "SMS & Call", tone: "from-pink-500/20 to-pink-500/5" },
] as const;

type Props = {
  mode: "login" | "signup";
  title: string;
  subtitle?: string;
  heroTitle: string;
  heroSubtitle?: string;
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
      <div className="auth-page relative min-h-screen overflow-hidden">
        <div className="auth-page-glow auth-page-glow-a" aria-hidden />
        <div className="auth-page-glow auth-page-glow-b" aria-hidden />

        <div className="relative flex min-h-screen flex-col lg:grid lg:grid-cols-[1.08fr_1fr]">
          {/* Hero */}
          <div className="auth-hero relative flex min-h-[42vh] flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-screen lg:px-12 lg:py-12">
            <div className="auth-hero-grid absolute inset-0 opacity-50" aria-hidden />
            <div className="auth-hero-shine absolute inset-0" aria-hidden />

            <div className="relative z-10">
              <BrandLogo
                size="lg"
                priority
                subtitle="Seller Dashboard"
                textClassName="[&_p:first-child]:text-white [&_p:last-child]:text-violet-200/80 [&_span]:text-violet-300"
              />
            </div>

            <div className="relative z-10 my-8 lg:my-0">
              <div className="auth-hero-badge mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-100 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Bangladesh ecommerce
              </div>

              <h2 className="max-w-lg text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.75rem]">
                <span className="text-white">{heroTitle}</span>
                <span className="mt-2 block bg-gradient-to-r from-violet-200 via-cyan-200 to-pink-200 bg-clip-text text-transparent">
                  {mode === "signup" ? "Start selling smarter" : "Your seller command center"}
                </span>
              </h2>

              {heroSubtitle ? (
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300/95 sm:text-base">
                  {heroSubtitle}
                </p>
              ) : (
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300/95 sm:text-base">
                  Manage orders, inventory, courier, SMS, and reports from one
                  polished dashboard built for Bangladesh sellers.
                </p>
              )}

              <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
                {HIGHLIGHTS.map(({ icon: Icon, label, tone }) => (
                  <div
                    key={label}
                    className={`auth-hero-chip flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br ${tone} px-3.5 py-3 backdrop-blur-sm`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-semibold text-white/95">{label}</span>
                  </div>
                ))}
              </div>

              <div className="auth-hero-stat mt-8 hidden items-center gap-4 lg:flex">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <BarChart3 className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">All-in-one Seller OS</p>
                  <p className="text-xs text-slate-400">Orders · stock · delivery · customer follow-up</p>
                </div>
              </div>
            </div>

            <p className="relative z-10 text-xs text-slate-500">
              © 2026 {BRAND_NAME}
            </p>
          </div>

          {/* Form panel */}
          <div className="auth-form-panel relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
            <div className="w-full max-w-[440px]">
              <div className="auth-form-card rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-violet-500/10 ring-1 ring-slate-200/60 backdrop-blur-xl sm:p-8">
                <div className="mb-7 text-center lg:text-left">
                  <div className="mb-5 flex justify-center lg:hidden">
                    <BrandLogo size="md" subtitle="Seller Dashboard" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">
                    {mode === "signup" ? "Create account" : "Sign in"}
                  </p>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {mode === "signup"
                        ? "Use your Google account to register as a new seller."
                        : "Use your Google account to open your dashboard."}
                    </p>
                  )}
                </div>

                <GoogleSignInButton
                  label={
                    mode === "signup"
                      ? "Sign up with Google"
                      : "Continue with Google"
                  }
                  variant={mode}
                />
              </div>

              {footerLink && (
                <p className="mt-6 text-center text-sm text-slate-600">
                  {footerLink.text}{" "}
                  <a
                    href={footerLink.href}
                    className="font-semibold text-violet-600 transition hover:text-violet-700 hover:underline"
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
