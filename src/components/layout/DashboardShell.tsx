"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WooAutoSyncRunner } from "@/components/web-orders/WooAutoSyncRunner";
import { WooStockDailySyncRunner } from "@/components/integration/woocommerce/WooStockDailySyncRunner";
import { WooWebhookPullRunner } from "@/components/web-orders/WooWebhookPullRunner";
import { IncompleteCaptureRunner } from "@/components/web-orders/IncompleteCaptureRunner";
import { ShopifyOrderAutoSyncRunner } from "@/components/web-orders/ShopifyOrderAutoSyncRunner";
import { CourierAutoSyncRunner } from "@/components/orders/CourierAutoSyncRunner";
import { CourierWebhookPullRunner } from "@/components/orders/CourierWebhookPullRunner";
import { Breadcrumbs } from "./Breadcrumbs";
import { FeatureGuard } from "./FeatureGuard";
import { DisabledBanner } from "./DisabledBanner";
import { PlanExpiryBanner } from "./PlanExpiryBanner";
import { HelpAssistant } from "@/components/dashboard/HelpAssistant";
import { useFeatures } from "@/context/FeatureContext";
import { Suspense } from "react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isEnabled } = useFeatures();

  return (
    <div className="dashboard-canvas min-h-screen overflow-x-hidden transition-colors duration-300">
      <Suspense fallback={null}>
        <Sidebar mobileOpen={sidebarOpen} />
      </Suspense>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="min-h-screen min-w-0 overflow-x-hidden lg:pl-[260px]">
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <main className="min-w-0 max-w-full overflow-x-hidden p-4 pb-24 lg:p-8">
          <Suspense fallback={null}>
            <DisabledBanner />
          </Suspense>
          <PlanExpiryBanner />
          <Breadcrumbs />
          <FeatureGuard>{children}</FeatureGuard>
        </main>
      </div>

      {isEnabled("help_assistant") ? <HelpAssistant /> : null}

      <WooAutoSyncRunner />
      <WooStockDailySyncRunner />
      <WooWebhookPullRunner />
      <IncompleteCaptureRunner />
      <ShopifyOrderAutoSyncRunner />
      <CourierAutoSyncRunner />
      <CourierWebhookPullRunner />
    </div>
  );
}
