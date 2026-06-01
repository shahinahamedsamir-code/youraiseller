"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { HelpAssistant } from "@/components/dashboard/HelpAssistant";
import { WooAutoSyncRunner } from "@/components/web-orders/WooAutoSyncRunner";
import { CourierAutoSyncRunner } from "@/components/orders/CourierAutoSyncRunner";
import { CourierWebhookPullRunner } from "@/components/orders/CourierWebhookPullRunner";
import { Breadcrumbs } from "./Breadcrumbs";
import { FeatureGuard } from "./FeatureGuard";
import { DisabledBanner } from "./DisabledBanner";
import { useFeatures } from "@/context/FeatureContext";
import { Suspense } from "react";

function HelpWidget() {
  const { isEnabled } = useFeatures();
  if (!isEnabled("help_assistant")) return null;
  return <HelpAssistant />;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-canvas min-h-screen overflow-x-hidden">
      <Sidebar mobileOpen={sidebarOpen} />

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
          <Breadcrumbs />
          <FeatureGuard>{children}</FeatureGuard>
        </main>
      </div>

      <HelpWidget />
      <WooAutoSyncRunner />
      <CourierAutoSyncRunner />
      <CourierWebhookPullRunner />
    </div>
  );
}
