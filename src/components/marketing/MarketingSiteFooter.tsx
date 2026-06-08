import { MarketingAppCta } from "@/components/marketing/MarketingAppCta";

export function MarketingSiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center text-sm text-slate-500 sm:flex-row sm:text-left lg:px-8">
        <p>© {new Date().getFullYear()} YourAI Seller — Ecommerce OS for Bangladesh</p>
        <MarketingAppCta>Open app</MarketingAppCta>
      </div>
    </footer>
  );
}
