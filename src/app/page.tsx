import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";

const appBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
const loginHref = appBase ? `${appBase}/login` : "/login";

export default function HomePage() {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center px-6">
      <BrandMark size="xl" priority className="mb-8 animate-float shadow-2xl shadow-violet-500/25" />
      <h1 className="bg-gradient-to-r from-slate-900 via-teal-700 to-violet-700 bg-clip-text text-center text-5xl font-extrabold tracking-tight text-transparent">
        {BRAND_NAME}
      </h1>

      <div className="mt-10">
        <Link
          href={loginHref}
          className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-violet-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-teal-500/25 transition hover:scale-[1.02] hover:shadow-2xl"
        >
          <LayoutDashboard className="h-5 w-5" />
          Open Ai Seller
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
