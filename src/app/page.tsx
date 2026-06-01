import Link from "next/link";
import { ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center px-6">
      <div className="animate-float mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-400 via-violet-500 to-orange-400 shadow-2xl shadow-violet-500/25">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <h1 className="bg-gradient-to-r from-slate-900 via-teal-700 to-violet-700 bg-clip-text text-center text-5xl font-extrabold tracking-tight text-transparent">
        YourAI Seller
      </h1>
      <p className="mt-4 max-w-lg text-center text-lg text-slate-600">
        Full ecommerce admin panel — orders, inventory, web orders, SMS &amp;
        reports.
      </p>

      <div className="mt-10">
        <Link
          href="/login"
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
