import type { ReactNode } from "react";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { MarketingSiteHeader } from "@/components/marketing/MarketingSiteHeader";

export function MarketingSiteShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: "package";
}) {
  return (
    <div className="marketing-site relative min-h-screen overflow-x-hidden bg-[#070b14] text-white">
      <div className="marketing-site-glow marketing-site-glow-a" aria-hidden />
      <div className="marketing-site-glow marketing-site-glow-b" aria-hidden />
      <div className="marketing-site-grid pointer-events-none absolute inset-0" aria-hidden />
      <MarketingSiteHeader active={active} />
      {children}
      <MarketingSiteFooter />
    </div>
  );
}
