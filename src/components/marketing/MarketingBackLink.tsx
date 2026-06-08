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
      className="mkt-nav-link mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold lg:hidden"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to home
    </Link>
  );
}
