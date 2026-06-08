import { headers } from "next/headers";
import { MainMarketingPage } from "@/components/marketing/MainMarketingPage";
import { resolveEffectiveHost, shouldShowMainMarketingPage } from "@/lib/app-hosts";

/** Production home (rewrite from /) or local preview at /marketing */
export default function MarketingPreviewPage() {
  const h = headers();
  const host = resolveEffectiveHost(
    (name) => h.get(name),
    h.get("x-url-hostname") ?? undefined
  );
  const isLiveHome =
    h.get("x-marketing-home") === "1" || shouldShowMainMarketingPage(host);

  return <MainMarketingPage homeHref={isLiveHome ? "/" : "/marketing"} />;
}
