"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Calculator,
  Calendar,
  CheckCircle2,
  Package,
  PackageX,
  RefreshCw,
  ShoppingCart,
  Skull,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";
import {
  applySmartRestock,
  getAbcAnalysis,
  getDeadStockProducts,
  getSmartRestockAnalytics,
  getSmartRestockList,
  type AbcAnalysisRow,
  type SmartRestockAnalytics,
  type SmartRestockItem,
} from "@/lib/inventory-store";

type Filter = "all" | "out" | "critical" | "low";
type QuickView = "main" | "dead" | "abc" | "forecast";

export function SmartRestockPanel() {
  const [items, setItems] = useState<SmartRestockItem[]>([]);
  const [analytics, setAnalytics] = useState<SmartRestockAnalytics>({
    lowStock: 0,
    critical: 0,
    outOfStock: 0,
    activeAlerts: 0,
  });
  const [deadStock, setDeadStock] = useState<ReturnType<typeof getDeadStockProducts>>([]);
  const [abcRows, setAbcRows] = useState<AbcAnalysisRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [quickView, setQuickView] = useState<QuickView>("main");
  const [showAll, setShowAll] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [success, setSuccess] = useState("");
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const refresh = useCallback(() => {
    const list = getSmartRestockList();
    setItems(list);
    setAnalytics(getSmartRestockAnalytics());
    setDeadStock(getDeadStockProducts());
    setAbcRows(getAbcAnalysis());
    setQtyById((prev) => {
      const next = { ...prev };
      for (const item of list) {
        if (next[item.product.id] == null) {
          next[item.product.id] = item.suggestedQty;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(t);
  }, [success]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "out" && item.status !== "out") return false;
      if (filter === "critical" && item.status !== "critical") return false;
      if (filter === "low" && item.status !== "low") return false;
      return true;
    });
  }, [items, filter]);

  const tableRows = showAll ? filtered : filtered.slice(0, 8);
  const needsAttention = analytics.outOfStock + analytics.critical;

  const recalculate = () => {
    setRecalculating(true);
    window.setTimeout(() => {
      refresh();
      setRecalculating(false);
      setSuccess("Analytics recalculated from latest inventory data.");
    }, 400);
  };

  const restockOne = (item: SmartRestockItem) => {
    const qty = qtyById[item.product.id] ?? item.suggestedQty;
    if (qty < 1) return;
    setRestockingId(item.product.id);
    setSuccess("");
    try {
      if (!applySmartRestock(item.product.id, qty)) return;
      void import("@/lib/woocommerce-stock-sync-store").then((m) =>
        m.maybeAutoSyncProductToWoo(item.product.id)
      );
      setSuccess(`Restocked ${item.product.name} (+${qty}).`);
      refresh();
    } finally {
      setRestockingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={recalculate}
          disabled={recalculating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Calculator className="h-4 w-4" />
          {recalculating ? "Calculating…" : "Recalculate Analytics"}
        </button>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {success && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </p>
      )}

      {/* Alert banner */}
      {needsAttention > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
            Attention Required: {analytics.outOfStock} product
            {analytics.outOfStock === 1 ? "" : "s"} out of stock. {analytics.critical}{" "}
            product{analytics.critical === 1 ? "" : "s"} critically low.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowAlertDetails(true);
              setFilter("all");
              setQuickView("main");
            }}
            className="inline-flex items-center gap-1 text-sm font-bold text-rose-700 hover:underline"
          >
            View Details <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Low Stock" value={analytics.lowStock} icon={AlertTriangle} tone="amber" />
        <StatCard label="Critical" value={analytics.critical} icon={PackageX} tone="rose" />
        <StatCard label="Out of Stock" value={analytics.outOfStock} icon={Package} tone="slate" />
        <StatCard label="Active Alerts" value={analytics.activeAlerts} icon={Bell} tone="sky" />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-900">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={Skull}
            title="Dead Stock"
            active={quickView === "dead"}
            onClick={() => setQuickView(quickView === "dead" ? "main" : "dead")}
          />
          <QuickActionCard
            icon={BarChart3}
            title="ABC Analysis"
            active={quickView === "abc"}
            onClick={() => setQuickView(quickView === "abc" ? "main" : "abc")}
          />
          <QuickActionCard
            icon={Calendar}
            title="Forecast"
            active={quickView === "forecast"}
            onClick={() => setQuickView(quickView === "forecast" ? "main" : "forecast")}
          />
          <Link
            href="/dashboard/inventory/stock/increase/new"
            className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5 text-center transition hover:border-teal-300 hover:shadow-md"
          >
            <ShoppingCart className="mb-2 h-8 w-8 text-teal-600" />
            <p className="text-sm font-bold text-slate-900">New Purchase</p>
          </Link>
        </div>
      </div>

      {/* Quick view panels */}
      {quickView === "dead" && (
        <InsightPanel title="Dead Stock" onClose={() => setQuickView("main")}>
          {deadStock.length === 0 ? (
            <p className="text-sm text-slate-500">No dead stock.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {deadStock.slice(0, 10).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="text-slate-500">Stock: {p.stockQty} · No sales recorded</span>
                </li>
              ))}
            </ul>
          )}
        </InsightPanel>
      )}

      {quickView === "abc" && (
        <InsightPanel title="ABC Analysis" onClose={() => setQuickView("main")}>
          {abcRows.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase text-slate-500">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Grade</th>
                  <th className="pb-2">Sold</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {abcRows.map((row) => (
                  <tr key={row.product.id} className="border-t border-slate-50">
                    <td className="py-2 font-medium text-slate-800">{row.product.name}</td>
                    <td className="py-2">
                      <GradeBadge grade={row.grade} />
                    </td>
                    <td className="py-2 text-slate-600">{row.soldQty}</td>
                    <td className="py-2 font-semibold text-slate-800">৳{row.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </InsightPanel>
      )}

      {quickView === "forecast" && (
        <InsightPanel title="Demand Forecast" onClose={() => setQuickView("main")}>
          {items.filter((i) => i.daysToStockout != null && i.product.stockQty > 0).length === 0 ? (
            <p className="text-sm text-slate-500">No forecast data.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items
                .filter((i) => i.daysToStockout != null && i.product.stockQty > 0)
                .slice(0, 10)
                .map((item) => (
                  <li key={item.product.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-slate-800">{item.product.name}</span>
                    <span className="font-bold text-amber-700">~{item.daysToStockout} days left</span>
                  </li>
                ))}
            </ul>
          )}
        </InsightPanel>
      )}

      {/* Products table */}
      <div className="yai-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="font-bold text-slate-900">Products Needing Reorder</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["out", "Out of Stock"],
                ["critical", "Critical"],
                ["low", "Low"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={clsx(
                  "rounded-lg px-2.5 py-1 text-xs font-bold",
                  filter === key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            ))}
            {filtered.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-bold text-teal-600 hover:underline"
              >
                {showAll ? "Show Less" : "View All"}
              </button>
            )}
          </div>
        </div>

        {tableRows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-teal-400" />
            <p className="font-semibold text-slate-800">All stock levels healthy</p>
            <p className="mt-1 text-sm text-slate-500">No products need reorder right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-bold uppercase text-slate-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Reorder Point</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr key={item.product.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-xs text-slate-500">{item.product.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "font-bold",
                          item.product.stockQty === 0 ? "text-rose-600" : "text-slate-800"
                        )}
                      >
                        {item.product.stockQty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.product.alertQty}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={restockingId === item.product.id}
                        onClick={() => restockOne(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal-500 to-violet-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        <Zap className="h-3 w-3" />
                        {restockingId === item.product.id
                          ? "…"
                          : `+${qtyById[item.product.id] ?? item.suggestedQty}`}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAlertDetails && (
        <GuideModal
          title="Attention Details"
          onClose={() => setShowAlertDetails(false)}
          body={
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Out of stock: {analytics.outOfStock}</li>
              <li>Critically low: {analytics.critical}</li>
              <li>Low stock: {analytics.lowStock}</li>
            </ul>
          }
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Package;
  tone: "amber" | "rose" | "slate" | "sky";
}) {
  const tones = {
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
    slate: "text-slate-600 bg-slate-100",
    sky: "text-sky-600 bg-sky-50",
  };
  return (
    <div className="glass-card flex items-center justify-between rounded-xl p-4">
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <span className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  active,
  onClick,
}: {
  icon: typeof Skull;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center rounded-xl border p-5 text-center transition",
        active
          ? "border-teal-400 bg-teal-50 shadow-sm ring-2 ring-teal-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      )}
    >
      <Icon className={clsx("mb-2 h-8 w-8", active ? "text-teal-600" : "text-slate-600")} />
      <p className="text-sm font-bold text-slate-900">{title}</p>
    </button>
  );
}

function InsightPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-bold text-slate-900">{title}</h4>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: SmartRestockItem["status"] }) {
  if (status === "out") {
    return (
      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
        Out of Stock
      </span>
    );
  }
  if (status === "critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
        <TrendingDown className="h-3 w-3" /> Critical
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
      Low Stock
    </span>
  );
}

function GradeBadge({ grade }: { grade: "A" | "B" | "C" }) {
  const cls =
    grade === "A"
      ? "bg-emerald-100 text-emerald-800"
      : grade === "B"
        ? "bg-sky-100 text-sky-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={clsx("rounded-md px-2 py-0.5 text-xs font-bold", cls)}>{grade}</span>
  );
}

function GuideModal({
  title = "Smart Restock Guide",
  body,
  onClose,
}: {
  title?: string;
  body?: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {body ?? null}
      </div>
    </div>
  );
}
