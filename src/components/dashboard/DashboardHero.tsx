"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Plus, Package, Zap, ArrowUpRight } from "lucide-react";
import { getSessionUser } from "@/lib/dev-users";
import { BRAND_NAME } from "@/lib/brand";
import { getOrderStats } from "@/lib/orders-store";
import { buildOverviewStats } from "@/lib/dashboard-stats";

type HeroInsight = {
  label: string;
  value: string;
  icon: typeof Sparkles;
  color: string;
};

function computeHeroInsights(): HeroInsight[] {
  const stats = getOrderStats();
  const weekStats = buildOverviewStats({ dateField: "approved", datePreset: "7d" });

  const pendingCount = stats.pending;
  const rtsCount = stats.rts;
  const needsAction = pendingCount + rtsCount;
  const insightText =
    needsAction > 0
      ? `${needsAction} order${needsAction === 1 ? "" : "s"} need action today`
      : "All orders are up to date";

  const shippedCount = stats.shipped;
  const fulfillmentText =
    rtsCount > 0
      ? `${rtsCount} RTS ready, ${shippedCount} shipped`
      : shippedCount > 0
        ? `${shippedCount} order${shippedCount === 1 ? "" : "s"} shipped`
        : "No pending fulfillment";

  const salesStat = weekStats.find((s) => s.id === "sales");
  const trend = salesStat?.trend;
  const growthText =
    trend !== null && trend !== undefined
      ? `${trend >= 0 ? "+" : ""}${Math.round(trend)}% vs last week`
      : "No comparison data yet";

  return [
    { label: "AI Insight", value: insightText, icon: Sparkles, color: "text-amber-300" },
    { label: "Fulfillment", value: fulfillmentText, icon: Zap, color: "text-cyan-300" },
    { label: "Growth", value: growthText, icon: ArrowUpRight, color: "text-emerald-300" },
  ];
}

export function DashboardHero() {
  const [userName, setUserName] = useState("");
  const [insights, setInsights] = useState<HeroInsight[]>([
    { label: "AI Insight", value: "Loading...", icon: Sparkles, color: "text-amber-300" },
    { label: "Fulfillment", value: "Loading...", icon: Zap, color: "text-cyan-300" },
    { label: "Growth", value: "Loading...", icon: ArrowUpRight, color: "text-emerald-300" },
  ]);

  useEffect(() => {
    const user = getSessionUser();
    setUserName(user?.name ?? "Seller");
    setInsights(computeHeroInsights());
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-[#1a1630] via-[#2d2650] to-[#1e1b3a] p-6 text-white shadow-2xl shadow-indigo-900/20 lg:p-8"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Smart AI Seller · Live
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            <span className="text-white/95">{greeting},</span>{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-rose-300 to-cyan-300 bg-clip-text text-transparent">
              {userName || "…"}
            </span>
          </h1>

          <p className="mt-3 text-sm font-medium text-white/80">
            Built for{" "}
            <strong className="bg-gradient-to-r from-violet-300 via-rose-300 to-cyan-300 bg-clip-text font-extrabold text-transparent">
              YourAI
            </strong>{" "}
            Seller — automate smarter, sell faster.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/dashboard/orders/approved/new"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-900 shadow-lg transition hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
          <Link
            href="/dashboard/inventory/products/new"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
          >
            <Package className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
        {insights.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur transition hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300/80">
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              {item.label}
            </div>
            <p className="mt-1 text-sm font-medium text-white/95">{item.value}</p>
          </div>
        ))}
      </div>

      <p className="relative mt-4 hidden text-[11px] font-medium uppercase tracking-[0.16em] text-indigo-300/60 lg:block">
        {BRAND_NAME} · Bangladesh ecommerce sellers
      </p>
    </motion.section>
  );
}
