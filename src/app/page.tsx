import { headers } from "next/headers";
import { AppSplashPage } from "@/components/marketing/AppSplashPage";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";
import {
  isLocalDevHost,
  isMarketingHost,
  isSplitDomainMode,
  resolveRequestHost,
} from "@/lib/app-hosts";

export default function HomePage() {
  const host = resolveRequestHost((name) => headers().get(name));

  if (
    host &&
    !isLocalDevHost(host) &&
    isSplitDomainMode() &&
    isMarketingHost(host)
  ) {
    return <MainMarketingPage />;
  }

  return <AppSplashPage />;
}
