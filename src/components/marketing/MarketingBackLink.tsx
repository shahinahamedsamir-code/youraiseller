"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { getMarketingHomePath } from "@/lib/marketing-nav";

export function MarketingBackLink() {
  const pathname = usePathname();
  return (
    <Link
      href={getMarketingHomePath(pathname)}
      className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-white lg:hidden"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to home
    </Link>
  );
}
