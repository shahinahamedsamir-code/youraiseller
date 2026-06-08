"use client";

import type { ReactNode } from "react";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { MarketingSiteHeader } from "@/components/marketing/MarketingSiteHeader";
import {
  MarketingThemeProvider,
  useMarketingTheme,
} from "@/components/marketing/MarketingThemeProvider";

function MarketingSiteFrame({
  children,
  active,
}: {
  children: ReactNode;
  active?: "package";
}) {
  const { theme, ready } = useMarketingTheme();

  return (
    <div
      className="marketing-site relative min-h-screen overflow-x-hidden antialiased"
      data-marketing-theme={ready ? theme : "dark"}
    >
      <div className="marketing-site-glow marketing-site-glow-a" aria-hidden />
      <div className="marketing-site-glow marketing-site-glow-b" aria-hidden />
      <div className="marketing-site-grid pointer-events-none absolute inset-0" aria-hidden />
      <MarketingSiteHeader active={active} />
      {children}
      <MarketingSiteFooter />
    </div>
  );
}

export function MarketingSiteShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: "package";
}) {
  return (
    <MarketingThemeProvider>
      <MarketingSiteFrame active={active}>{children}</MarketingSiteFrame>
    </MarketingThemeProvider>
  );
}
