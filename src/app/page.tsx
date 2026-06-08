import { headers } from "next/headers";
import { AppSplashPage } from "@/components/marketing/AppSplashPage";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";
import { HomePageClientFallback } from "@/components/marketing/HomePageClientFallback";
import { resolveEffectiveHost, shouldShowMainMarketingPage } from "@/lib/app-hosts";

export default function HomePage() {
  const h = headers();
  const host = resolveEffectiveHost(
    (name) => h.get(name),
    h.get("x-url-hostname") ?? undefined
  );

  if (
    h.get("x-marketing-home") === "1" ||
    shouldShowMainMarketingPage(host)
  ) {
    return <MainMarketingPage homeHref="/" />;
  }

  return (
    <HomePageClientFallback>
      <AppSplashPage />
    </HomePageClientFallback>
  );
}
