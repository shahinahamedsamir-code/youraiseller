"use client";

import { motion } from "framer-motion";
import {
  Package,
  Wallet,
  TrendingUp,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import clsx from "clsx";

type StatCardProps = {
  label: string;
  value: string;
  trend: number | null;
  icon: "package" | "wallet" | "trending" | "clock";
  accent: "indigo" | "rose" | "amber" | "cyan";
  index: number;
};

const icons = {
  package: Package,
  wallet: Wallet,
  trending: TrendingUp,
  clock: Clock,
};

const accents = {
  indigo: {
    bar: "bg-indigo-500",
    icon: "bg-indigo-500/10 text-indigo-600",
    ring: "ring-indigo-100",
  },
  rose: {
    bar: "bg-rose-500",
    icon: "bg-rose-500/10 text-rose-600",
    ring: "ring-rose-100",
  },
  amber: {
    bar: "bg-amber-500",
    icon: "bg-amber-500/10 text-amber-600",
    ring: "ring-amber-100",
  },
  cyan: {
    bar: "bg-cyan-500",
    icon: "bg-cyan-500/10 text-cyan-600",
    ring: "ring-cyan-100",
  },
};

export function StatCard({
  label,
  value,
  trend,
  icon,
  accent,
  index,
}: StatCardProps) {
  const Icon = icons[icon];
  const a = accents[accent];
  const up = trend !== null && trend > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={clsx(
        "yai-panel group relative min-w-0 overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-xl md:p-5",
        `ring-1 ${a.ring}`
      )}
    >
      <div className={clsx("absolute left-0 top-0 h-full w-1", a.bar)} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p
            className={clsx(
              "mt-2 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl"
            )}
          >
            {value}
          </p>
          {trend !== null && (
            <div
              className={clsx(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
              )}
            >
              {up ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            a.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
