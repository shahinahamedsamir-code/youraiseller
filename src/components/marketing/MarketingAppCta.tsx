import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { getAppBaseUrl } from "@/lib/app-hosts";

export function MarketingAppCta({
  className,
  children,
  large,
}: {
  className?: string;
  children: ReactNode;
  large?: boolean;
}) {
  const href = `${getAppBaseUrl()}/login`;
  return (
    <Link
      href={href}
      className={clsx(
        "marketing-cta inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 via-violet-600 to-indigo-600 font-bold text-white shadow-lg shadow-violet-500/25 transition hover:scale-[1.02] hover:shadow-xl",
        large ? "px-8 py-4 text-base" : "px-5 py-2.5 text-sm",
        className
      )}
    >
      {children}
    </Link>
  );
}
