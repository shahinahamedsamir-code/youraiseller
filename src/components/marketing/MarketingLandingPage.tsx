import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandLogo";
import { BRAND_TAGLINE } from "@/lib/brand";

type MarketingLandingPageProps = {
  loginUrl: string;
};

export function MarketingLandingPage({ loginUrl }: MarketingLandingPageProps) {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center px-6">
      <BrandMark
        size="xl"
        priority
        className="mb-8 animate-float shadow-2xl shadow-violet-500/25"
      />

      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500/90">
        {BRAND_TAGLINE}
      </p>

      <h1 className="text-center text-5xl font-extrabold tracking-tight lg:text-6xl">
        <span className="text-slate-900">Your</span>
        <span className="bg-gradient-to-r from-cyan-500 to-teal-600 bg-clip-text text-transparent">
          AI
        </span>{" "}
        <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
          Seller
        </span>
      </h1>

      <p className="mt-4 max-w-lg text-center text-lg leading-relaxed text-slate-600">
        Full ecommerce admin panel — orders, inventory, web orders, SMS &amp;
        reports.
      </p>

      <p className="mt-2 max-w-md text-center text-sm text-slate-500">
        Built for Bangladesh sellers — automate smarter, sell faster.
      </p>

      <div className="mt-10">
        <Link
          href={loginUrl}
          className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-violet-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-teal-500/25 transition hover:scale-[1.02] hover:shadow-2xl"
        >
          <LayoutDashboard className="h-5 w-5" />
          Open Ai Seller
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Ecommerce management for your business
      </p>
    </div>
  );
}
