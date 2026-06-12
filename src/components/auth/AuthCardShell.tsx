"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: { text: string; href: string; label: string };
};

export function AuthCardShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="auth-page relative min-h-screen overflow-hidden">
      <div className="auth-page-glow auth-page-glow-a" aria-hidden />
      <div className="auth-page-glow auth-page-glow-b" aria-hidden />
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[440px]">
          <div className="auth-form-card rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-violet-500/10 ring-1 ring-slate-200/60 backdrop-blur-xl sm:p-8">
            <div className="mb-7 text-center">
              <div className="mb-5 flex justify-center">
                <BrandLogo size="md" subtitle="Seller Dashboard" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">
                Account
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
            </div>
            {children}
          </div>
          {footer ? (
            <p className="mt-6 text-center text-sm text-slate-600">
              {footer.text}{" "}
              <Link
                href={footer.href}
                className="font-semibold text-violet-600 transition hover:text-violet-700 hover:underline"
              >
                {footer.label}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
