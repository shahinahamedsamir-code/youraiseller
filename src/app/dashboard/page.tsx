"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Crown } from "lucide-react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { WebOrderReport } from "@/components/dashboard/WebOrderReport";
import { OrdersBySource } from "@/components/dashboard/OrdersBySource";
import { OrderCountsChart } from "@/components/dashboard/OrderCountsChart";
import { HourlyOrdersChart } from "@/components/dashboard/HourlyOrdersChart";
import { TopProductsList } from "@/components/dashboard/TopProductsList";
import { FounderDashboard } from "@/components/dashboard/FounderDashboard";
import { useFeatures } from "@/context/FeatureContext";
import clsx from "clsx";

export default function DashboardPage() {
  const { isEnabled } = useFeatures();
  const tabs = [
    { id: "main" as const, label: "Main Dashboard", icon: LayoutGrid, enabled: true },
    {
      id: "founder" as const,
      label: "Founder Dashboard",
      icon: Crown,
      enabled: isEnabled("founder_dashboard"),
    },
  ].filter((t) => t.enabled);

  const [activeTab, setActiveTab] = useState<"main" | "founder">("main");

  if (!isEnabled("dashboard") && !isEnabled("founder_dashboard")) {
    return (
      <div className="yai-panel p-8 text-center">
        <p className="font-semibold text-slate-800">Dashboard is disabled</p>
        <p className="mt-2 text-sm text-slate-500">Contact admin to enable access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tabs.length > 1 && (
        <div className="flex gap-8 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "border-teal-500 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "founder" ? (
        <FounderDashboard />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <DashboardHero />

          <OverviewSection />

          <section className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <WebOrderReport />
            <OrdersBySource />
          </section>

          <section className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <OrderCountsChart />
            </div>
            <div className="lg:col-span-2">
              <TopProductsList />
            </div>
          </section>

          <HourlyOrdersChart />
        </motion.div>
      )}
    </div>
  );
}
