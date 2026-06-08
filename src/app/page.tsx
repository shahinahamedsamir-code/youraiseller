import { headers } from "next/headers";
import { AppSplashPage } from "@/components/marketing/AppSplashPage";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";
import { resolveRequestHost, shouldShowMainMarketingPage } from "@/lib/app-hosts";

export default function HomePage() {
  const host = resolveRequestHost((name) => headers().get(name));

  if (shouldShowMainMarketingPage(host)) {
    return <MainMarketingPage />;
  }

  return <AppSplashPage />;
}
