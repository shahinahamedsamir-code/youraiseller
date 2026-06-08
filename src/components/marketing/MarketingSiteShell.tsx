import type { ReactNode } from "react";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { MarketingSiteHeader } from "@/components/marketing/MarketingSiteHeader";
import { MarketingThemeProvider } from "@/components/marketing/MarketingThemeProvider";

export function MarketingSiteShell({
  children,
  active,
  homeHref,
}: {
  children: ReactNode;
  active?: "package";
  homeHref?: string;
}) {
  return (
    <MarketingThemeProvider>
      <MarketingSiteHeader active={active} homeHref={homeHref} />
      {children}
      <MarketingSiteFooter />
    </MarketingThemeProvider>
  );
}
