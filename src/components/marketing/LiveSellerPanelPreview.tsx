"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type LiveModule = {
  label: string;
  tone: string;
  dot: string;
  bar: string;
  stats: string[];
  levels: number[];
};

const MODULES: LiveModule[] = [
  {
    label: "Web orders",
    tone: "from-cyan-500/20 to-cyan-500/5",
    dot: "bg-cyan-500 shadow-cyan-500/50",
    bar: "bg-gradient-to-r from-cyan-500/90 to-cyan-400/50",
    stats: ["+3 new", "+7 today", "12 pending"],
    levels: [42, 58, 71, 55, 68],
  },
  {
    label: "Auto call",
    tone: "from-violet-500/20 to-violet-500/5",
    dot: "bg-violet-500 shadow-violet-500/50",
    bar: "bg-gradient-to-r from-violet-500/90 to-violet-400/50",
    stats: ["2 ringing", "5 queued", "89% answer"],
    levels: [35, 48, 62, 54, 70],
  },
  {
    label: "Inventory",
    tone: "from-emerald-500/20 to-emerald-500/5",
    dot: "bg-emerald-500 shadow-emerald-500/50",
    bar: "bg-gradient-to-r from-emerald-500/90 to-emerald-400/50",
    stats: ["4 low stock", "18 SKUs", "2 restock"],
    levels: [55, 63, 58, 72, 66],
  },
  {
    label: "Courier",
    tone: "from-sky-500/20 to-sky-500/5",
    dot: "bg-sky-500 shadow-sky-500/50",
    bar: "bg-gradient-to-r from-sky-500/90 to-sky-400/50",
    stats: ["6 shipped", "Steadfast", "3 pickup"],
    levels: [60, 74, 68, 81, 77],
  },
  {
    label: "SMS",
    tone: "from-teal-500/20 to-teal-500/5",
    dot: "bg-teal-500 shadow-teal-500/50",
    bar: "bg-gradient-to-r from-teal-500/90 to-teal-400/50",
    stats: ["24 sent", "98% delivered", "2 credits"],
    levels: [28, 41, 36, 49, 44],
  },
  {
    label: "Reports",
    tone: "from-fuchsia-500/20 to-fuchsia-500/5",
    dot: "bg-fuchsia-500 shadow-fuchsia-500/50",
    bar: "bg-gradient-to-r from-fuchsia-500/90 to-fuchsia-400/50",
    stats: ["Live KPIs", "৳42k today", "Updating…"],
    levels: [72, 85, 78, 92, 88],
  },
];

const TICKER = [
  "Web order #1042 confirmed",
  "Auto call answered · Dhaka",
  "Steadfast parcel booked",
  "Stock synced · WooCommerce",
  "SMS delivered · 01XXXXXXXXX",
];

export function LiveSellerPanelPreview({ appHost }: { appHost: string }) {
  const [tick, setTick] = useState(0);
  const [levels, setLevels] = useState(() => MODULES.map((m) => m.levels[0]));
  const [stats, setStats] = useState(() => MODULES.map((m) => m.stats[0]));
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % TICKER.length);
      setActiveCard((c) => (c + 1) % MODULES.length);
      setLevels((prev) =>
        prev.map((level, i) => {
          const pool = MODULES[i].levels;
          const next = pool[Math.floor(Math.random() * pool.length)];
          return Math.abs(next - level) < 8 ? pool[(pool.indexOf(level) + 1) % pool.length] : next;
        })
      );
      setStats((prev) =>
        prev.map((stat, i) => {
          const pool = MODULES[i].stats;
          const idx = pool.indexOf(stat);
          return pool[(idx + 1) % pool.length];
        })
      );
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="marketing-fade marketing-fade-3 relative">
      <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-500/15 blur-2xl marketing-live-glow sm:-inset-4" />
      <div className="marketing-live-panel mkt-live-panel relative overflow-hidden rounded-2xl p-4 sm:rounded-[1.75rem] sm:p-6">
        <div className="marketing-live-scan pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative mb-4 flex items-center justify-between gap-2">
          <p className="mkt-text-subtle flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <span className="marketing-live-pulse relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live seller panel
          </p>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-500/25">
            All modules
          </span>
        </div>

        <div className="relative grid grid-cols-2 gap-2 sm:gap-2.5">
          {MODULES.map((card, i) => (
            <div
              key={card.label}
              className={clsx(
                "marketing-live-card mkt-border rounded-xl border bg-gradient-to-br p-3 sm:p-3.5 transition duration-500",
                card.tone,
                activeCard === i && "ring-1 ring-violet-500/30"
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={clsx(
                    "marketing-live-dot inline-block h-2 w-2 rounded-full shadow-sm",
                    card.dot,
                    activeCard === i && "scale-110"
                  )}
                />
                <span
                  className={clsx(
                    "truncate text-[10px] font-semibold transition-opacity duration-500",
                    activeCard === i ? "mkt-text opacity-100" : "mkt-text-subtle opacity-80"
                  )}
                >
                  {stats[i]}
                </span>
              </div>
              <p className="mkt-text text-sm font-bold">{card.label}</p>
              <div className="mkt-progress-track mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={clsx(
                    "marketing-live-bar h-full rounded-full transition-all duration-1000 ease-out",
                    card.bar
                  )}
                  style={{ width: `${levels[i]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mkt-live-ticker relative mt-4 overflow-hidden rounded-xl px-3 py-2">
          <p className="mkt-text-muted truncate text-center text-[11px]">
            <span className="mr-1.5 font-bold text-emerald-500">●</span>
            {TICKER[tick]}
          </p>
        </div>

        <p className="mkt-text-subtle relative mt-3 text-center text-[11px]">
          Sign in at <span className="font-mono mkt-text-muted">{appHost}</span>
        </p>
      </div>
    </div>
  );
}
