"use client";

import { useLayoutEffect, useState } from "react";
import { shouldShowMainMarketingPage } from "@/lib/app-hosts";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";

function readMarketingHomeHint(): boolean | null {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.getAttribute("data-marketing-home");
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

/**
 * Hostinger may send the wrong Host header on SSR. Avoid flashing the app splash
 * on youraiseller.com while the real hostname is resolved on the client.
 */
export function HomePageClientFallback({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showMarketing, setShowMarketing] = useState<boolean | null>(() => {
    const hint = readMarketingHomeHint();
    if (hint === true) return true;
    if (typeof window !== "undefined") {
      return shouldShowMainMarketingPage(window.location.hostname);
    }
    return hint === false ? false : null;
  });

  useLayoutEffect(() => {
    setShowMarketing(shouldShowMainMarketingPage(window.location.hostname));
  }, []);

  if (showMarketing === true) {
    return <MainMarketingPage homeHref="/" />;
  }

  // Unknown host on SSR — dark shell instead of white app splash (prevents 1s flash)
  if (showMarketing === null) {
    return <div className="min-h-screen bg-[#0a0a0f]" aria-hidden />;
  }

  return <>{children}</>;
}
