"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Package,
  PackageX,
  RefreshCw,
  RotateCcw,
  Search,
  Warehouse,
  X,
} from "lucide-react";
import {
  getInventoryHealthStats,
  getInventoryMovementSummary,
  getNegativeStockProducts,
  getProductMovementHistory,
  loadProducts,
  type InventoryHealthStats,
  type InventoryMovementSummary,
  type Product,
  type StockMovement,
} from "@/lib/inventory-store";

type Tab = "overview" | "warehouse";
type Period = 7 | 14 | 30;

export function InventoryDashboardPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>(7);
  const [health, setHealth] = useState<InventoryHealthStats>({
    totalProducts: 0,
    healthyStock: 0,
    lowStock: 0,
    outOfStock: 0,
    negativeStock: 0,
  });
  const [movement, setMovement] = useState<InventoryMovementSummary>({
    unitsSold: 0,
    unitsPurchased: 0,
    returns: 0,
    netChange: 0,
    totalMovements: 0,
  });
  const [negativeProducts, setNegativeProducts] = useState<Product[]>([]);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);

  const refresh = useCallback(() => {
    setHealth(getInventoryHealthStats());
    setMovement(getInventoryMovementSummary(period));
    setNegativeProducts(getNegativeStockProducts());
  }, [period]);

  useEffect(() => {
    refresh();
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  const openHistory = (product: Product) => {
    setHistoryProduct(product);
    setHistory(getProductMovementHistory(product.id));
  };

  return (
    <div className="space-y-6">
      {/* Tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(
            [
              ["overview", "Overview"],
              ["warehouse", "Warehouse Lookup"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "rounded-lg px-4 py-2 text-sm font-bold transition",
                tab === key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/inventory/smart-restock"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Stock Reconciliation
          </Link>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {tab === "overview" ? (
        <>
          {/* Stock health */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Stock Health Overview</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <HealthCard label="Total Products" value={health.totalProducts} tone="sky" icon={Boxes} />
              <HealthCard label="Healthy Stock" value={health.healthyStock} tone="emerald" icon={CheckCircle2} />
              <HealthCard label="Low Stock" value={health.lowStock} tone="amber" icon={AlertTriangle} />
              <HealthCard label="Out of Stock" value={health.outOfStock} tone="rose" icon={PackageX} />
              <HealthCard label="Negative Stock" value={health.negativeStock} tone="violet" icon={Package} />
            </div>
          </section>

          {/* Movement summary */}
          <section className="yai-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <h3 className="font-bold text-slate-900">Stock Movement Summary</h3>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value) as Period)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <MovementStat
                label="Units Sold"
                value={movement.unitsSold}
                prefix="−"
                tone="rose"
                icon={ArrowDownRight}
              />
              <MovementStat
                label="Units Purchased"
                value={movement.unitsPurchased}
                prefix="+"
                tone="emerald"
                icon={ArrowUpRight}
              />
              <MovementStat
                label="Returns"
                value={movement.returns}
                prefix="+"
                tone="amber"
                icon={RotateCcw}
              />
              <MovementStat
                label="Net Change"
                value={movement.netChange}
                prefix={movement.netChange >= 0 ? "+" : "−"}
                tone={movement.netChange >= 0 ? "emerald" : "rose"}
                icon={movement.netChange >= 0 ? ArrowUpRight : ArrowDownRight}
                sub={`${movement.totalMovements} total movements`}
              />
            </div>
          </section>

          {/* Attention required */}
          <section className="yai-panel overflow-hidden">
            <div className="border-b border-slate-100 bg-rose-50/50 px-4 py-3">
              <h3 className="flex items-center gap-2 font-bold text-rose-900">
                <AlertTriangle className="h-4 w-4" /> Attention Required
              </h3>
              <p className="text-xs text-rose-700/80">Negative stock needs immediate review</p>
            </div>
            {negativeProducts.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                No negative stock — inventory quantities look consistent.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {negativeProducts.slice(0, 10).map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-rose-50/20">
                        <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                        <td className="px-4 py-3 font-bold text-violet-600">{p.stockQty}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openHistory(p)}
                            className="text-xs font-bold text-teal-600 hover:underline"
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {negativeProducts.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <Link
                  href="/dashboard/inventory/smart-restock"
                  className="text-sm font-semibold text-teal-600 hover:underline"
                >
                  Open Smart Restock to fix stock levels →
                </Link>
              </div>
            )}
          </section>
        </>
      ) : (
        <WarehouseLookup onViewHistory={openHistory} />
      )}

      {historyProduct && (
        <HistoryModal
          product={historyProduct}
          rows={history}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </div>
  );
}

function HealthCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "sky" | "emerald" | "amber" | "rose" | "violet";
  icon: typeof Boxes;
}) {
  const styles = {
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  };

  return (
    <div className={clsx("rounded-xl border p-4", styles[tone])}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold opacity-80">{label}</p>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function MovementStat({
  label,
  value,
  prefix,
  tone,
  icon: Icon,
  sub,
}: {
  label: string;
  value: number;
  prefix: string;
  tone: "rose" | "emerald" | "amber";
  icon: typeof ArrowUpRight;
  sub?: string;
}) {
  const abs = Math.abs(value);
  const colors = {
    rose: "text-rose-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={clsx("text-2xl font-bold", colors[tone])}>
        {prefix}
        {abs.toLocaleString()}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function WarehouseLookup({
  onViewHistory,
}: {
  onViewHistory: (product: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const products = useMemo(() => loadProducts().filter((p) => p.active !== false), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <section className="yai-panel overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h3 className="flex items-center gap-2 font-bold text-slate-900">
          <Warehouse className="h-4 w-4" /> Warehouse Lookup
        </h3>
        <p className="text-xs text-slate-500">Search product stock across your inventory</p>
      </div>
      <div className="border-b border-slate-100 p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product name or SKU..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {results.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No products found.</p>
        ) : (
          results.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/60"
            >
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.code}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "rounded-lg px-2.5 py-1 text-sm font-bold",
                    p.stockQty < 0
                      ? "bg-violet-100 text-violet-700"
                      : p.stockQty === 0
                        ? "bg-rose-100 text-rose-700"
                        : p.stockQty <= p.alertQty
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  Stock: {p.stockQty}
                </span>
                <button
                  type="button"
                  onClick={() => onViewHistory(p)}
                  className="text-xs font-bold text-teal-600 hover:underline"
                >
                  View History
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function HistoryModal({
  product,
  rows,
  onClose,
}: {
  product: Product;
  rows: StockMovement[];
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
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Stock History</h3>
            <p className="text-sm text-slate-500">{product.name}</p>
            <p className="font-mono text-xs text-slate-400">{product.code}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No movement history yet.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold capitalize text-slate-800">{m.type}</span>
                    <span
                      className={clsx(
                        "font-bold",
                        m.type === "decrease" ? "text-rose-600" : "text-emerald-600"
                      )}
                    >
                      {m.type === "decrease" ? "−" : "+"}
                      {m.qty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {m.reason} · {m.createdAt}
                  </p>
                  {m.note && <p className="text-xs text-slate-400">{m.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
