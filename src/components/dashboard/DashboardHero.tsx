"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Package } from "lucide-react";
import { getSessionUser } from "@/lib/dev-users";

export function DashboardHero() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = getSessionUser();
    setUserName(user?.name ?? "Seller");
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
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-rose-300 to-cyan-300 bg-clip-text text-transparent">
              {userName || "…"}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
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

    </motion.section>
  );
}
