"use client";

import { useLayoutEffect, useState } from "react";
import { shouldShowMainMarketingPage } from "@/lib/app-hosts";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";

/**
 * Hostinger may send the wrong Host header on SSR. Resolve the real hostname
 * after mount so server HTML always matches the first client render (no hydration error).
 */
export function HomePageClientFallback({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showMarketing, setShowMarketing] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    setShowMarketing(shouldShowMainMarketingPage(window.location.hostname));
  }, []);

  if (showMarketing === true) {
    return <MainMarketingPage homeHref="/" />;
  }

  return <>{children}</>;
}
