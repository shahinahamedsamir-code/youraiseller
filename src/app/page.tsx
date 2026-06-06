import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MarketingLandingPage } from "@/components/marketing/MarketingLandingPage";
import { isAppHost, isSplitDomainMode, resolveRequestHost } from "@/lib/app-hosts";

export default function HomePage() {
  const host = resolveRequestHost((name) => headers().get(name));
  if (host && isSplitDomainMode() && isAppHost(host)) {
    redirect("/login");
  }

  return <MarketingLandingPage />;
}
