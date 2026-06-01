"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { getBreadcrumbs } from "@/lib/breadcrumbs";

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 hover:bg-slate-100 hover:text-teal-600"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.slice(1).map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          {i === crumbs.length - 2 ? (
            <span className="font-semibold capitalize text-slate-800">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="capitalize hover:text-teal-600"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
