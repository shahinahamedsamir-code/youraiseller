import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandLogo";

type MarketingLandingPageProps = {
  loginUrl: string;
};

export function MarketingLandingPage({ loginUrl }: MarketingLandingPageProps) {
  return (
    <div className="landing-page mesh-bg relative min-h-screen overflow-hidden">
      <div className="landing-glow landing-glow-a" aria-hidden />
      <div className="landing-glow landing-glow-b" aria-hidden />
      <div className="landing-glow landing-glow-c" aria-hidden />
      <div className="landing-grid absolute inset-0" aria-hidden />

      <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="landing-card w-full max-w-[480px] rounded-[2rem] border border-white/70 bg-white/75 p-8 text-center shadow-2xl shadow-violet-500/10 ring-1 ring-slate-200/60 backdrop-blur-xl sm:p-10">
          <div className="landing-fade landing-fade-1 mx-auto mb-6 flex justify-center">
            <div className="landing-logo-wrap">
              <span className="landing-logo-ring" aria-hidden />
              <BrandMark
                size="xl"
                priority
                className="relative animate-float shadow-2xl shadow-violet-500/30"
              />
            </div>
          </div>

          <h1 className="landing-fade landing-fade-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="text-slate-900">Your</span>
            <span className="bg-gradient-to-r from-cyan-500 to-teal-600 bg-clip-text text-transparent">
              AI
            </span>{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Seller
            </span>
          </h1>

          <p className="landing-fade landing-fade-3 mx-auto mt-3 max-w-sm text-sm text-slate-500">
            Orders, inventory &amp; courier — one dashboard.
          </p>

          <div className="landing-fade landing-fade-4 mt-8">
            <Link
              href={loginUrl}
              className="landing-cta group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 via-violet-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-500/25 transition hover:scale-[1.02] hover:shadow-2xl"
            >
              <LayoutDashboard className="h-5 w-5" />
              Open Ai Seller
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
