import { MarketingFeatureDetailPage } from "@/components/marketing/MarketingFeatureDetailPage";
import { featurePageGroupIds } from "@/lib/marketing-feature-pages";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return featurePageGroupIds().map((slug) => ({ slug }));
}

export default function MarketingFeatureDetailPreviewPage({
  params,
}: {
  params: { slug: string };
}) {
  return <MarketingFeatureDetailPage slug={params.slug} homeHref="/marketing" />;
}
