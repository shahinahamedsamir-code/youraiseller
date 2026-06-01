"use client";

import { IntegrationConnectPanel } from "@/components/integration/IntegrationConnectPanel";

export default function ShopifyIntegrationPage() {
  return (
    <IntegrationConnectPanel
      title="Shopify Integration"
      description="Connect Shopify to import orders and sync inventory"
      brandColor="#96bf48"
      storePlaceholder="https://yourstore.myshopify.com"
      connectLabel="Connect Shopify"
      syncOptions={[
        "Import Shopify orders",
        "Sync inventory levels",
        "Fulfillment status sync",
        "Product variant mapping",
      ]}
    />
  );
}
