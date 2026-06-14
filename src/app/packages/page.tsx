import { MarketingPackagesPage } from "@/components/marketing/MarketingPackagesPage";
import { MARKETING_PACKAGES } from "@/lib/marketing-packages-content";
import { loadPlanConfig } from "@/lib/plan-config-server";
import { planFeaturesFromConfig } from "@/lib/plan-config-utils";

export const dynamic = "force-dynamic";

/** Package & pricing — youraiseller.com/packages */
export default async function PackagesPage() {
  const config = await loadPlanConfig();
  const visiblePackages = MARKETING_PACKAGES.filter(
    (pkg) => config.plans.find((p) => p.id === pkg.id)?.active !== false
  );
  const planFeaturesById = Object.fromEntries(
    config.plans.map((plan) => [plan.id, planFeaturesFromConfig(config, plan.id)])
  );
  return (
    <MarketingPackagesPage packages={visiblePackages} planFeaturesById={planFeaturesById} />
  );
}
