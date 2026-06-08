import { headers } from "next/headers";
import { AppSplashPage } from "@/components/marketing/AppSplashPage";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";
import { HomePageClientFallback } from "@/components/marketing/HomePageClientFallback";
import { shouldShowMainMarketingPage } from "@/lib/app-hosts";

export default function HomePage() {
  const h = headers();
  const host =
    h.get("x-effective-host") ??
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "";

  if (shouldShowMainMarketingPage(host)) {
    return <MainMarketingPage />;
  }

  return (
    <HomePageClientFallback>
      <AppSplashPage />
    </HomePageClientFallback>
  );
}
