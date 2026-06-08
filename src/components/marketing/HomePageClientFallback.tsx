"use client";

import { useEffect, useState } from "react";
import { shouldShowMainMarketingPage } from "@/lib/app-hosts";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";

/** Corrects wrong proxy Host headers on Hostinger (youraiseller.com → marketing). */
export function HomePageClientFallback({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showMarketing, setShowMarketing] = useState(false);

  useEffect(() => {
    if (shouldShowMainMarketingPage(window.location.hostname)) {
      setShowMarketing(true);
    }
  }, []);

  if (showMarketing) return <MainMarketingPage />;
  return <>{children}</>;
}
