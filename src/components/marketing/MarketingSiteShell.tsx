import type { ReactNode } from "react";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { MarketingSiteHeader } from "@/components/marketing/MarketingSiteHeader";
import { MarketingLanguageProvider } from "@/components/marketing/MarketingLanguageProvider";
import { MarketingThemeProvider } from "@/components/marketing/MarketingThemeProvider";

export function MarketingSiteShell({
  children,
  active,
  homeHref,
}: {
  children: ReactNode;
  active?: "package" | "features";
  homeHref?: string;
}) {
  return (
    <MarketingThemeProvider>
      <MarketingLanguageProvider>
        <MarketingSiteHeader active={active} homeHref={homeHref} />
        {children}
        <MarketingSiteFooter />
      </MarketingLanguageProvider>
    </MarketingThemeProvider>
  );
}
